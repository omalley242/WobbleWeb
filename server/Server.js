
//SETUP CODE =========================================================

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

//Beacon info ---------------------------
var XA = 100;
var XB = 50;
var XC = 0;

var YA = 0;
var YB = 150;
var YC = 0;

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

        console.log(`error ${err.message}`);
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

    //Handle requests from the esp32 
    app.get('/esp', (req, res) => {
        console.log("-----Esp32 Message Recieved-----");
        console.log("Message of type GET");
        res.status(200).json({direction: "left"});
    });

    app.get('/nodes', (req, res) => {
        console.log("Fetching all nodes");
        database_connection.query("SELECT * FROM Nodes", function(err, result, fields) {
            if (err) throw err;
            res.json(result);
        });
    });

    app.get('/paths', (req, res) => {
        console.log("Fetching all paths");
        database_connection.query("SELECT * FROM Paths", function(err, result, fields) {
            if (err) throw err;
            res.json(result);
        });
    });

    app.get('/clear', (req, res) => {
        console.log("Deleting all rows");

        database_connection.query("DELETE FROM Nodes", function(err, result, fields) {
            if (err) throw err;
        });
        database_connection.query("DELETE FROM Paths", function(err, result, fields) {
            if (err) throw err;
        });

        console.log("Complete Deletion");
    });

    app.post('/add/node', bodyParser.json(), (req, res) => {
        console.log("Adding New Node");
        console.log(req.body);
        console.log(req);
        
        let reqbody = req.body;
        // let nodeJson = reqbody.Node;
        // let pathsJson = reqbody.Path;

        let ALPHA = reqbody.HeadingAlpha;
        let GAMMA = reqbody.HeadingGamma;

        ANG_ALPHA=ALPHA * Math.PI / 180;
        ANG_GAMMA=GAMMA * Math.PI / 180;
        
        ANG_BETA=2*Math.PI - ANG_ALPHA - ANG_GAMMA;

        COT_ALPHA = 1/Math.tan(ANG_ALPHA);
        COT_BETA = 1/Math.tan(ANG_BETA);
        COT_GAMMA = 1/Math.tan(ANG_GAMMA);

        KA = 1/(COT_A - COT_ALPHA);
        KB = 1/(COT_B - COT_BETA);
        KC = 1/(COT_C - COT_GAMMA);
        K  = KA + KB + KC;

          // calculate final coordinates
        PX = (KA*XA + KB*XB + KC*XC)/K;
        PY = (KA*YA + KB*YB + KC*YC)/K;

        console.log("X coordinate:" + PX + "; Y coordinate:" + PY);

        // database_connection.query(`INSERT INTO Nodes VALUES (${nodeJson.Id},${nodeJson.X},${nodeJson.Y},0,0,0,0)`, function(err, result, fields) {
        //     if (err) throw err;
        // });

        // pathsJson.map((pathItem) => {
        //     database_connection.query(`INSERT INTO Paths VALUES (${pathItem.Start_Id},0,0,0,0)`, function(err, result, fields) {
        //     if (err) throw err;
        //     });
        // });

        res.status(200).json("Recieved shiz");
        console.log("Added new Node");
    });

    console.log("starting server on port: " + PORT);

    //launch the server
    app.listen(PORT);
}

server_init();