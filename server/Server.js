
//SETUP CODE =========================================================

var MergeRadius = 5;
var MergeAngle = 0.1;
var PathMergeAngle = 0.1;

//fetch the mysql node library
var sql = require('mysql');

//Fetch my current IPV4 incase it has changed since restart
const axios = require("axios");

//set the port number to listen on
var PORT = 5000;

//a library to locate the current path
const path = require('path');

//load the express library
const express = require('express');
const app = express();


//load the websocket library
const WebSocket = require('ws');
const WebSocketMotorControlServer = new WebSocket.Server({noServer: true});
const WebSocketManualControlServer = new WebSocket.Server({noServer: true});

//Allow for json parsing within the body of a html request
const bodyParser = require('body-parser');
const { NULL } = require('mysql/lib/protocol/constants/types');

//Id for storing nodes as unique within the database
var NodeId = 0;

var LastId;
var currentId;



//Beacon info ---------------------------
var XA = 0;
var XB = 0;
var XC = 360;

var YA = 0;
var YB = 240;
var YC = 240;

//find distances between points
var AB=Math.sqrt( Math.pow((XA-XB),2) + Math.pow((YA-YB),2) );
var AC=Math.sqrt( Math.pow((XA-XC),2) + Math.pow((YA-YC),2) );
var BC=Math.sqrt( Math.pow((XB-XC),2) + Math.pow((YB-YC),2) );

//find angles between points
var ANG_A = Math.acos( (Math.pow(AB, 2) + Math.pow(AC,2) - Math.pow(BC,2))/(2*AB*AC) );
var ANG_B = Math.acos( (Math.pow(AB, 2) + Math.pow(BC,2) - Math.pow(AC,2))/(2*AB*BC) );
var ANG_C = Math.acos( (Math.pow(AC, 2) + Math.pow(BC,2) - Math.pow(AB,2))/(2*AC*BC) );

//find cotangent of landmark angles
COT_A = 1/Math.tan(ANG_A);
COT_B = 1/Math.tan(ANG_B);
COT_C = 1/Math.tan(ANG_C);

//End of Beacon info -------------------


function server_init() {

    axios("https://checkip.amazonaws.com/").then(response => {
        let current_ip = response.data

        //Setup the Database connection
        var connection = sql.createConnection({
            host: {current_ip},
            user: "DBUSR",
            password: "",
            database: "Maze"
        });
        
        main_server(connection);

    }, err => {

        console.log(`error connecting to database: ${err.message}`);
    });
}

// Code to shutdown server correctly on Ctrl-C
process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    // some other closing procedures go here
    process.exit(0);
  });

//MAIN PROCESS LOOP =====================================================
function main_server(database_connection) {Introduction:

    database_connection.connect((err) => {
        if (err) throw err;
        console.log("Successful database connection");
    });

    //tell the server to use static files within the react-build section
    app.use(express.static(path.join(__dirname, '../react-app/build')));

    //For any get request send /react-app/build/index.html (except for linked files within the html)
    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..','react-app', 'build', 'index.html'))
    });

    //Fetch the nodes within the database
    app.get('/nodes', (req, res) => {
        database_connection.query("SELECT * FROM Nodes", function(err, result, fields) {
            if (err) throw err;
            res.json(result);
        });
    });

    //Fetch the paths within the database
    app.get('/paths', (req, res) => {
        database_connection.query("SELECT * FROM Paths WHERE (StartId IS NOT NULL) AND (EndId IS NOT NULL)", function(err, result, fields) {
            if (err) throw err;
            res.json(result);
        });
    });

    //Delete all data within the database
    app.get('/clear', (req, res) => {

        //Reseting Global vars
        NodeId = 0;
        currentId = undefined;
        LastId = undefined;

        //Reseting the database
        console.log("Deleting all rows");
        database_connection.query("DELETE FROM Nodes", function(err) {
            if (err) throw err;
        });
        database_connection.query("DELETE FROM Paths", function(err) {
            if (err) throw err;
        });

        console.log("Reset Complete");
    });


    //A function to add a node to the database
    function addNodeToDatabase(PX, PY, ANG_ALPHA, ANG_BETA, ANG_GAMMA){
        console.log(`Adding Node with ID: ${NodeId}`);
        database_connection.query(`INSERT INTO Nodes VALUES (${NodeId},${PX},${PY},${ANG_ALPHA},${ANG_BETA},${ANG_GAMMA})`, function(err, result, fields) {
            if (err) 
                throw err;
        });     
    }

    function addNodeToDatabaseSimple(PX, PY){
        console.log(`Adding Node with ID: ${NodeId}`);
        database_connection.query(`INSERT INTO Nodes VALUES (${NodeId},${PX},${PY},0,0,0)`, function(err, result, fields) {
            if (err) throw err;
        });     
    }

    //Algorithm to find position
    function calculate_Tienstra_formula(ANG_ALPHA, ANG_GAMMA){
        ANG_BETA = 2*Math.PI - (ANG_ALPHA + ANG_GAMMA);
        console.log(`Angle Beta: ${ANG_BETA}`);
        //Find cotangent angles
        COT_ALPHA = 1/Math.tan(ANG_ALPHA);
        COT_BETA = 1/Math.tan(ANG_BETA);
        COT_GAMMA = 1/Math.tan(ANG_GAMMA);

        //Find Scalars from cotangents
        KA = 1/(COT_A - COT_ALPHA);
        KB = 1/(COT_B - COT_BETA);
        KC = 1/(COT_C - COT_GAMMA);
        K  = KA + KB + KC;

        // calculate final coordinates
        PX = (KA*XA + KB*XB + KC*XC)/K;
        PY = (KA*YA + KB*YB + KC*YC)/K;

        console.log("Position Calculated:");
        console.log("X coordinate:" + PX + "; Y coordinate:" + PY);

        return {PX, PY};
    }

    function addPath(StartId, Heading){
        // StartId | EndId | Heading From Start | Distance |
        console.log(`Attempting to Add Path to Node ${StartId}`);
        //Check if the path has already been travesered, in the oposite direction, i.e match headings
        database_connection.query(`SELECT * FROM Paths WHERE EndId=${currentId} OR ((StartId=${currentId} AND EndId IS NOT NULL) AND (Heading BETWEEN ${Heading + PathMergeAngle} AND ${Heading - PathMergeAngle}))`, (err, result) => {
            if (err) console.log(`Error Checking path: ${err.code}`);
            //If more than one result is returned it is already 
            if(result.length > 0){
                console.log(`Path Already Exists`);
            }else{
                database_connection.query(`INSERT INTO Paths VALUES (${StartId},NULL,${Heading},5)`, (err) => {
                    if (err) console.log(`Error Adding path: ${err.code}`);
                });       
            }
        });
         
    }

    function completePath(currentId, LastId){
        console.log(`Completing Path From ${LastId} To ${currentId}`);
        //Compare Headings Here
        // StartId | EndId | Heading From Start | Distance |
        database_connection.query(`UPDATE Paths SET EndId=${currentId} WHERE (StartId=${LastId} AND EndId IS NULL)`, (err) => {
            if (err) console.log(`Error updating path: ${err.code}`);
        });        
    }

    function promiseQuery(query) {
        return new Promise((resolve, reject) => {
            database_connection.query(query, (err, result) => {
                if (err) {
                    console.log(`Query did not return result: ${err.code}`);
                    return reject(err);
                }
                resolve(result);
            })
        })
    }

    async function completePathDirect(currentId, LastId){
        console.log(`Completing Path From ${LastId} To ${currentId}`);

        let firstNode = await promiseQuery(`SELECT * FROM Nodes WHERE ID=${LastId}`)
        let secondNode = await promiseQuery(`SELECT * FROM Nodes WHERE ID=${currentId}`)
        
        // d=√((x2 – x1)² + (y2 – y1)²)

        console.log("calculating distance");
        let distance = Math.sqrt(Math.pow(secondNode[0].XCoordinate - firstNode[0].XCoordinate, 2) + Math.pow(secondNode[0].YCoordinate - firstNode[0].YCoordinate, 2));
        // console.log(distance);
        // console.log(firstNode[0].XCoordinate)

        //Compare Headings Here
        // StartId | EndId | Heading From Start | Distance |
        database_connection.query(`UPDATE Paths SET EndId=${currentId}, Distance=${distance} WHERE (StartId=${LastId} AND EndId IS NULL)`, (err) => {
            if (err) console.log(`Error updating path: ${err.code}`);
        });     
    }

    app.get('/testdik', (req, res) => {
        dijkstras(0,2);
        res.send("working dik test");
    });

    //node content ID | XCoordinate | YCoordinate | HeadingAlpha | HeadingBeta | HeadingGamma |
    async function dijkstras(startNodeId, EndNodeId){
        // From start id to end if, iterate through id's and make key value, id_origin: {id_neighbour: distance, id_neighbour: distance} 
        // e.g.
        // let graph = {
        //     start: { A: 5, B: 2 },
        //     A: { start: 1, C: 4, D: 2 },
        //     B: { A: 8, D: 7 },
        //     C: { D: 6, finish: 3 },
        //     D: { finish: 1 },
        //     finish: {},
        // };
        var start = await promiseQuery(`SELECT Distance, EndId FROM Paths WHERE StartId=${startNodeId}`)
        console.log(start[0].StartId);

        var graph = new Object();

        Object.assign(graph, start);

        console.log(graph);

        // graph.start[0].StartId = { (start[0].EndId) : (start[0].distance)};
        
        // graph.(start[0].StartId)

        // for (node = startNodeId; node <= EndNodeId; node++){
            //add node and neighbours to key value list
        

        // database_connection.query(`SELECT * FROM Nodes`, function(err, result, fields) {
        //     if (err) throw err;
        //     nodes = result;
        //     console.log(nodes);
        // });

    }

    function queryPathDistance(NodeId1, NodeId2){
        return new Promise((resolve, reject) => {
            database_connection.query(`SELECT Distance FROM Paths WHERE (StartId="${NodeId1} AND EndId="${NodeId2}) OR (EndId="${NodeId1} AND StartID="${NodeId2})"`, (error, result, _fields) => {
                if (error) {
                    console.log(`Error path does not exsist: ${err.code}`);
                    reject(error);
                } else {
                    resolve(result);
                }        
            });    
        })
    } 

    function queryPathConnections(NodeId){

    }

    app.post('/add/simplenode', bodyParser.json(), (req, res) => {
        console.log("Adding New Simple Node");
        console.log(req.body);
        
        //Fetch Json from HTTP
        let nodeJson = req.body.Node;

        let PX = nodeJson.X;
        let PY = nodeJson.Y;

        // ID | XCoordinate | YCoordinate | HeadingAlpha | HeadingBeta | HeadingGamma |
        //check for similar entries
        database_connection.query(`SELECT ID FROM Nodes WHERE ((XCoordinate BETWEEN ${PX - MergeRadius} AND ${PX + MergeRadius}) AND (YCoordinate BETWEEN ${PY - MergeRadius} AND ${PY + MergeRadius}))`, function(err, result, fields) {
            if (err) 
                throw err;
            if (result.length != 0) {

                //If the node already exists
                console.log("This Node Already Exist Within Database");

                if (result.length >= 2){

                    addNodeToDatabaseSimple(PX, PY);
                    
                    currentId = NodeId;

                    NodeId = NodeId + 1;
                    
                }else {
                    currentId = result[0].ID;
                }

            } else {
                addNodeToDatabaseSimple(PX, PY);

                currentId = NodeId;

                NodeId = NodeId + 1;
            }
    
            database_connection.query(`INSERT INTO Paths VALUES (${currentId},NULL,100,5)`, (err) => {
                if (err) console.log(`Error Adding path: ${err.code}`);
            });

            //If it isnt the first node or a repeated node (we didnt move)
            if (LastId !== undefined && LastId !== currentId){
                console.log("LastId = " + LastId);
                console.log("currentId = " + currentId);
                completePathDirect(currentId, LastId);
            }
    
            LastId = currentId;

            res.status(200).json(`Recieved Node With Id: ${currentId}`);

        });
    
    });

    app.post('/add/node', bodyParser.json(), (req, res) => {
        console.log("Adding New Node");
        console.log(req.body);
        
        //Fetch Json from HTTP
        let nodeJson = req.body.Node;

        //Set ALPHA and GAMMA Angles
        let ANG_ALPHA = nodeJson.HeadingAlpha;
        // let ANG_BETA = nodeJson.HeadingBeta;
        let ANG_GAMMA = nodeJson.HeadingGamma;

        let {PX, PY} = calculate_Tienstra_formula(ANG_ALPHA, ANG_GAMMA);

        // ID | XCoordinate | YCoordinate | HeadingAlpha | HeadingBeta | HeadingGamma |
        //check for similar entries
        database_connection.query(`SELECT ID FROM Nodes WHERE ((XCoordinate BETWEEN ${PX - MergeRadius} AND ${PX + MergeRadius}) AND (YCoordinate BETWEEN ${PY - MergeRadius} AND ${PY + MergeRadius})) OR ((HeadingAlpha BETWEEN ${ANG_ALPHA - MergeAngle} AND ${ANG_ALPHA + MergeAngle}) AND (HeadingBeta BETWEEN ${ANG_BETA - MergeAngle} AND ${ANG_BETA + MergeAngle}) AND (HeadingGamma BETWEEN ${ANG_GAMMA - MergeAngle} AND ${ANG_GAMMA + MergeAngle})) `, function(err, result, fields) {
            if (err) 
                throw err;
            if (result.length != 0) {

                //If the node already exists
                console.log("This Node Already Exist Within Database");

                if (result.length >= 2){

                    addNodeToDatabase(PX, PY, ANG_ALPHA, ANG_BETA, ANG_GAMMA);
                    
                    currentId = NodeId;

                    NodeId = NodeId + 1;
                    
                }else {
                    currentId = result[0].ID;
                }

            } else {
                addNodeToDatabase(PX, PY, ANG_ALPHA, ANG_BETA, ANG_GAMMA);

                currentId = NodeId;

                NodeId = NodeId + 1;
            }

            pathArray = nodeJson.Paths

            for (let i=0; i<pathArray.length; i++){
                addPath(currentId, pathArray[i].Heading);
            }
    
            //If it isnt the first node or a repeated node (we didnt move)
            if (LastId !== undefined && LastId !== currentId){
                console.log("LastId = " + LastId);
                console.log("currentId = " + currentId);
                completePath(currentId, LastId);
            }
    
            LastId = currentId;

            if (err) throw err;
            res.status(200).json(`Recieved Node With Id: ${currentId}`);

        });
    
    });

    console.log("starting server on port: " + PORT);

    //launch the server
    let server = app.listen(PORT);

    //On upgrade request
    server.on('upgrade', (request, socket, head) => {
        console.log("Upgrade HTTP Request Recieved");

        if(request.url === "/MotorControl"){
            //Upgrade the connection
            WebSocketMotorControlServer.handleUpgrade(request, socket, head, (WebSocket) => {
                console.log("Motor Control Connection Established");
                //Emit the new connection to motor control websocket server
                WebSocketMotorControlServer.emit("connection", WebSocket, request);
            })
        }

        if(request.url === "/ManualControl"){
            //Upgrade the Connection for client to server (manual controls)
            WebSocketManualControlServer.handleUpgrade(request, socket, head, (WebSocket) => {
                console.log("Manual Control Connection Established");
                //Emit the new connection to the manual control websocket server
                WebSocketManualControlServer.emit("connection", WebSocket, request);
            })
        }

    })

    //Motor Control Server is Server to Master Esp
    WebSocketMotorControlServer.on('connection', function(WebSocketConnection, connectionRequest) {
        //For any message on this given connection handle
        WebSocketConnection.on('message', (message)=> {
            console.log("Motor Control Message Recieved");
            console.log("X: " + message.X);
            console.log("Y: " + message.Y);
            console.log("Yaw: " + message.Yaw);
            console.log("Flag: " + message.Flag); //Jakes Legma

            WebSocketManualControlServer.clients.forEach((WebSocketConnection) => {
                WebSocketConnection.send(message);
            })
        })

    })

    //Manual Control Server is Client to Server Communication
    WebSocketManualControlServer.on('connection', function(WebSocketConnection, connectionRequest) {
        //For any message on this given connection handle
        WebSocketConnection.on('message', (message)=> {
            console.log("Manual Control Message Recieved");
            console.log("Pos: " + message.Pos);
            console.log("Yaw: " + message.Yaw);

            
            //Send the message from the client websocket to all connections on the Motor Control web socket
            WebSocketMotorControlServer.clients.forEach((WebSocketConnection) => {
                WebSocketConnection.send(message);
                
            });
        })

    })
}

server_init();