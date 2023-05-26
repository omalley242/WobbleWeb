
//load the express library
const express = require('express');
const app = express();

//a library to locate the current path
const path = require('path');

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


//set the port number to listen on
const PORT = 5000;
console.log("Server has been started on port", PORT);

//launch the server
app.listen(PORT);
