
//load the express library
const express = require('express');
const app = express();

//tell the server to use static files within the react-build section
app.use(express.static('../react-app/build'));

//a library to locate the current path
const path = require('path');

//For any get request send /react-app/build/index.html (except for linked files within the html)
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..','react-app', 'build', 'index.html'))
});

//set the port number to listen on
const PORT = 5000;
console.log("Server has been started on port", PORT);

//launch the server
app.listen(PORT);
