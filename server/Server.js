
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

        let reqbody = req.body;
        let nodeJson = reqbody.Node;
        let pathsJson = reqbody.Path;

        database_connection.query(`INSERT INTO Nodes VALUES (${nodeJson.Id},${nodeJson.X},${nodeJson.Y},0,0,0,0)`, function(err, result, fields) {
            if (err) throw err;
        });

        pathsJson.map((pathItem) => {
            database_connection.query(`INSERT INTO Paths VALUES (${pathItem.Start_Id},0,0,0,0)`, function(err, result, fields) {
            if (err) throw err;
            });
        });

        res.status(200).json("Recieved shiz");
        console.log("Added new Node");
    });

    console.log("starting server on port: " + PORT);

    //launch the server
    app.listen(PORT);
}

server_init();