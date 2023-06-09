
//SETUP CODE =========================================================

var MergeRadius = 3;
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
const { NULL, ENUM } = require('mysql/lib/protocol/constants/types');

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

var EndNodeId;

function server_init() {

    axios("https://checkip.amazonaws.com/").then(response => {
        let current_ip = response.data;

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
        database_connection.query(`INSERT INTO Nodes VALUES (${NodeId},${PX},${PY},${ANG_ALPHA},${ANG_BETA},${ANG_GAMMA},"green")`, function(err, result, fields) {
            if (err) 
                throw err;
        });     
    }

    function addNodeToDatabaseSimple(PX, PY){
        console.log(`Adding Node with ID: ${NodeId}`);
        database_connection.query(`INSERT INTO Nodes VALUES (${NodeId},${PX},${PY},0,0,0,'green')`, function(err) {
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
                database_connection.query(`INSERT INTO Paths VALUES (${StartId},NULL,${Heading},5,'blue')`, (err) => {
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

    // Find closest node
    let closestNode = (distances, visited) => {
        // create a default value for shortest
        let closest = null;
        
        // for each node in the distances object
        for (let node in distances) {
            // if no node has been assigned to closest yet
            // or if the current node's distance is smaller than the current closest
            let currentIsclosest =
                closest === null || distances[node] < distances[closest];
                
            // and if the current node is in the unvisited set
            if (currentIsclosest && !visited.includes(node)) {
                // update closest to be the current node
                closest = node;
            }
        }
        return closest;
    };

    let findShortestPath = (graph, startNode, endNode) => {
    
        // track distances from the start node using a hash object
        let distances = {};
        distances[endNode] = "Infinity";
        distances = Object.assign(distances, graph[startNode]);
        // track paths using a hash object
        let parents = { endNode: null };

        for (let child in graph[startNode]) {
            parents[child] = startNode;
        }
        
        // collect visited nodes
        let visited = [];
        // find the nearest node
        let node = closestNode(distances, visited);
        
        // for that node:
        while (node) {
            // find its distance from the start node & its child nodes
            let distance = distances[node];
            let children = graph[node]; 
                
            // for each of those child nodes:
            for (let child in children) {
            
                // make sure each child node is not the start node
                if (String(child) === String(startNode)) {
                    continue;
                } else {
                    // save the distance from the start node to the child node
                    let newdistance = distance + children[child];
                    // if there's no recorded distance from the start node to the child node in the distances object
                    // or if the recorded distance is shorter than the previously stored distance from the start node to the child node
                    if (!distances[child] || distances[child] > newdistance) {
                        // save the distance to the object  
                            distances[child] = newdistance;
                        // record the path
                            parents[child] = node;
                    } 
                }
            }  
                // move the current node to the visited set
                visited.push(node);
                // move to the nearest neighbor node
                node = closestNode(distances, visited);
        }
        
        // using the stored paths from start node to end node
        // record the shortest path
        let shortestPath = [endNode];

        let parent = parents[endNode];

        while (parent) {
            shortestPath.push(parent);
            parent = parents[parent];
        }
        shortestPath.reverse();

        shortestPath.unshift(distances[endNode]);
        
        // //this is the shortest path
        // let results = {
        //     distance: distances[endNode],
        //     path: shortestPath,
        // };
        // // return the shortest path & the end node's distance from the start node
        // return results;

        return shortestPath;
    };
  
    app.get('/dijkstras', (req, res) => {     
        if(EndNodeId != undefined)
            dijkstras('0',EndNodeId).then((shortestPath) => {
                database_connection.query(`UPDATE Paths SET Colour='green' `, (err) => {
                    if (err) console.log(`Error updating path: ${err.code}`);
                });
                database_connection.query(`UPDATE Nodes SET Colour='green' `, (err) => {
                    if (err) console.log(`Error updating path: ${err.code}`);
                });
                // console.log(shortestPath);
                for(let i=2; i<shortestPath.length; i++){
                    // console.log("Last Id:" + shortestPath[i-1] +  "; CurrentId: " + shortestPath[i]);    
                    database_connection.query(`UPDATE Paths SET Colour='red' WHERE StartId=${shortestPath[i-1]} AND EndId=${shortestPath[i]} OR StartId=${shortestPath[i]} AND EndId=${shortestPath[i-1]} `, (err) => {
                        if (err) console.log(`Error updating path: ${err.code}`);
                    });
                }
                for(let i=0; i<shortestPath.length; i++){
                    // console.log("Id:" + shortestPath[i]);    
                    database_connection.query(`UPDATE Nodes SET Colour='red' WHERE ID=${shortestPath[i]}`, (err) => {
                        if (err) console.log(`Error updating node: ${err.code}`);
                    });
                }
                res.send((shortestPath[0]).toString());
            // res.send("test");
            });
    });

    // node-content ID | XCoordinate | YCoordinate | HeadingAlpha | HeadingBeta | HeadingGamma |

    // path-content StartId | EndId | Heading From Start | Distance |

    async function dijkstras(startNodeId, endNodeId){
        // From start id to end if, iterate through id's and make key value, nodeData = { id_origin: {id_neighbour: distance, id_neighbour: distance} }
        var nodeData = new Object();

        for (let node = startNodeId; node <= currentId; node++){
            let curNode = await promiseQuery(`SELECT * FROM Paths WHERE StartId=${node} OR EndId=${node}`);
            nodeData[node] = JSON.parse(JSON.stringify(curNode));
        }

        // console.log(`nodeData:`);
        // console.log(nodeData);

        for (node in nodeData) {
            let temp_dic = {};
            nodeData[node].forEach(nodepath => temp_dic[((nodepath.StartId == node) ? nodepath.EndId : nodepath.StartId)] = nodepath.Distance);
            nodeData[node] = temp_dic;
        }
        // console.log(nodeData);
        return findShortestPath(nodeData, startNodeId, endNodeId);

    }

    app.get('/setEndNode', (req) => {
        EndNodeId = req.query.nodeId;
        database_connection.query(`UPDATE Nodes SET Colour='green' WHERE Colour != 'red'`, (err) => {
            if (err) console.log(`Error updating path: ${err.code}`);
        });
        database_connection.query(`UPDATE Nodes SET Colour='blue' WHERE ID=${EndNodeId}`, (err) => {
            if (err) console.log(`Error updating path: ${err.code}`);
        });
        console.log("NewEndNode" + EndNodeId);
    })

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
    
            database_connection.query(`INSERT INTO Paths VALUES (${currentId},NULL,${Math.random()},5,'green')`, (err) => {
                if (err) console.log(`Error Adding path: ${err.code}`);
            });

            //If it isnt the first node or a repeated node i.e we have a new node
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