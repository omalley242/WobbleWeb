
//SETUP CODE =========================================================

var MergeRadius = 5;
var MergeAngle = 0.1;
var HeadingMergeAngle = 0.1;

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

const bodyParser = require('body-parser');

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

//MAIN PROCESS LOOP =====================================================
function main_server(database_connection) {

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
        database_connection.query("DELETE FROM Nodes", function(err, result, fields) {
            if (err) throw err;
        });
        database_connection.query("DELETE FROM Paths", function(err, result, fields) {
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

        // let invert = false;
        // if(PX < 0 || PX > 360 || PY < 0 || PY > 240) {
        //     PX = 360 - (Math.sign(PX)*PX)%360;
        //     PY = 240 - (Math.sign(PY)*PY)%240;
        //     invert = true;
        //     console.log("Editing Value");
        // }

        // if (invert){
        //     tmp = PX/3 * 2;
        //     PX = PY/2 * 3;
        //     PY = tmp;
        // }

        console.log("Position Calculated:");
        console.log("X coordinate:" + PX + "; Y coordinate:" + PY);

        return {PX, PY};
    }

    function addPath(StartId, Heading){
        // StartId | EndId | Heading From Start | Distance |
        console.log(`Adding Paths to Node ${StartId}`);
        database_connection.query(`INSERT INTO Paths VALUES (${StartId},NULL,${Heading},NULL)`, function(err, result, fields) {
        if (err) console.log(`Error Adding path: ${err.code}`);
        });                
    }

    function completePath(currentId, LastId){
        console.log(`Completing Path From ${LastId} To ${currentId}`);

        //Compare Headings Here
        // StartId | EndId | Heading From Start | Distance |
        database_connection.query(`UPDATE Paths SET EndId=${currentId} WHERE (StartId=${LastId} AND EndId IS NULL)`, function(err, result, fields) {
            if (err) console.log(`Error updating path: ${err.code}`);
        });        
    }

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

                //If the node already exsists
                console.log("This Node Already Exists Database");

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

            res.status(200).json(`Recieved Node With Id: ${currentId}`);

        });
    
    });

    console.log("starting server on port: " + PORT);

    //launch the server
    app.listen(PORT);
}

server_init();