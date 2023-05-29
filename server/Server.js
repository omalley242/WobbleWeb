
//SETUP CODE =========================================================

function server_init() {

    //fetch the mysql node library
    var sql = require('mysql');

    //Fetch my current IPV4 incase it has changed since restart
    const axios = require("axios");

    axios("https://checkip.amazonaws.com/").then(response => {
        let current_ip = response.data

        //Setup the Database connection
        var connection = sql.createConnection({
            host: {current_ip},
            user: "DBUSR",
            password: "",
            database: "Maze"
        });

        connection.connect(function(err) {
            if(err) throw err;
            console.log("Successfully connected to database...\n");
        });
        
        main_server();

    }, err => {

        console.log(`error ${err.message}`);
    });
}

//MAIN PROCESS LOOP =====================================================
function main_server() {

    //set the port number to listen on
    var PORT = 5000;

    //a library to locate the current path
    const path = require('path');
    const { get } = require('http');

    //load the express library
    const express = require('express');
    const app = express();

    //tell the server to use static files within the react-build section
    app.use(express.static(path.join(__dirname, '../react-app/build')));

    //For any get request send /react-app/build/index.html (except for linked files within the html)
    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..','react-app', 'build', 'index.html'))
    });


    //Handle requests from the esp32 
    app.get('/esp', (req, res) => {
        req.accepts('json, text');
        console.log("-----Esp32 Message Recieved-----");
        console.log("Message of type GET");
        res.status(200).json({direction: "left"});
    });

    //Handle requests from the esp32 
    app.post('/esp', (req, res) => {
        req.accepts('json, text');
        console.log("-----Esp32 Message Recieved-----");
        console.log("Message of type GET");
        res.status(200).json({direction: "left"});
    });

    //Handle requests from the esp32 
    app.put('/esp', (req, res) => {
        req.accepts('json, text');
        console.log("-----Esp32 Message Recieved-----");
        console.log("Message of type PUT");
        res.status(200).json({direction: "left"});
    });

    //Handle requests from the esp32 
    app.delete('/esp', (req, res) => {
        req.accepts('json, text');
        console.log("-----Esp32 Message Recieved-----");
        console.log("Message of type DELETE");
        res.status(200).json({direction: "left"});
    });

    //launch the server
    app.listen(PORT);
}

server_init();