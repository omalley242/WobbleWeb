import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

//Render the main page
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

//dictionary holding all currently pressed keys
var keys = {};


console.log(window.location.host);
//Setup WebSocket to the server
let webSocket = new WebSocket("ws://" + window.location.host + "/ManualControl", "ManualControl");


//If we receive a message update our position
var cur_position_data = {};

webSocket.onmessage = (event) => {
  cur_position_data = JSON.parse(event.data);
}

//Movement Speed / Distance difference
var Displacement = 10;

//Key listeners
document.addEventListener('keydown', (e) => {
  if(e.code === "KeyW"){
    console.log("Forward Command Recieved");
    webSocket.send(JSON.stringify({"XPos": (cur_position_data.XPos + Displacement)*Math.sin(cur_position_data.heading), "YPos": (cur_position_data.YPos + Displacement)*Math.cos(cur_position_data.heading), "Heading": cur_position_data.heading}));
  }
  else if(e.code === "KeyS"){
    console.log("Back Command Recieved");
    webSocket.send(JSON.stringify({"XPos": (cur_position_data.XPos - Displacement)*Math.sin(cur_position_data.heading), "YPos": (cur_position_data.YPos - Displacement)*Math.cos(cur_position_data.heading), "Heading": cur_position_data.heading}));
  }
  else if(e.code === "KeyD"){
    console.log("Right Turn Command Recieved");
    webSocket.send(JSON.stringify({"XPos": cur_position_data.XPos, "YPos": cur_position_data.YPos, "Heading": cur_position_data.heading + 0.3}));
  }
  else if(e.code === "KeyA"){
    console.log("Left Turn Command Recieved");
    webSocket.send(JSON.stringify({"XPos": cur_position_data.XPos, "YPos": cur_position_data.YPos, "Heading": cur_position_data.heading - 0.3}));
  }
});


