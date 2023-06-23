import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

//Render the main page
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App websocketData={websocketData}/>
  </React.StrictMode>
);

//dictionary holding all currently pressed keys
var keys = {};


console.log(window.location.host);
//Setup WebSocket to the server
let webSocket = new WebSocket("ws://" + window.location.host + "/ManualControl", "ManualControl");


//If we receive a message update our position
var websocketData = {};

webSocket.onmessage = (message) => {
  websocketData = JSON.parse(message.data);
  console.log(message);
}

//Movement Speed / Distance difference
var Displacement = 0;
var TurningHeading = 0;

//Key listeners
document.addEventListener('keydown', (e) => {
  if(e.code === "KeyW"){
    console.log("Forward Command Recieved");
    webSocket.send(JSON.stringify({"Target_R": 1}));
    Displacement += 0.01;//Jake Line 2
  }
  else if(e.code === "KeyS"){
    console.log("Back Command Recieved");
    webSocket.send(JSON.stringify({"Target_R": -1}));
    Displacement -= 0.01;
  }
  else if(e.code === "KeyD"){
    console.log("Right Turn Command Recieved");
    webSocket.send(JSON.stringify({"Target_Theta": 1}));
    TurningHeading += 0.01;
  }
  else if(e.code === "KeyA"){
    console.log("Left Turn Command Recieved");
    webSocket.send(JSON.stringify({"Target_Theta": -1}));
    TurningHeading -= 0.01;
  }
});


