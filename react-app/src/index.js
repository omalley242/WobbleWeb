import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
//Render the main page
const root = ReactDOM.createRoot(document.getElementById('root'));

//Setup WebSocket to the server
let websocket = new WebSocket("ws://" + window.location.host + "/ManualControl", "ManualControl");

root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);

//If we receive a message update our position
var websocketData = {};

websocket.onmessage = (message) => {
  // websocketData = JSON.parse(message.data);
  // pathData = pathData.reduce((lastPathId, path)=> {
  //   if (lastPathId == null){
  //     pathcolor = 'blue';
  //     return path.StartId;
  //   }else if (websocketData.contains(path.StartId) && websocketData.contains(lastPathId)){
  //     path[color] = 'red';
  //     return path.StartId;
  //   }else {
  //     return lastPathId;
  //   }
    
  // }, null);
  console.log(message);
}

//Movement Speed / Distance difference
var Displacement = 0;
var TurningHeading = 0;

//Key listeners
document.addEventListener('keydown', (e) => {
  if(e.code === "KeyW"){
    console.log("Forward Command Recieved");
    websocket.send(JSON.stringify({"Target_R": 1}));
    Displacement += 0.01;//Jake Line 2
  }
  else if(e.code === "KeyS"){
    console.log("Back Command Recieved");
    websocket.send(JSON.stringify({"Target_R": -1}));
    Displacement -= 0.01;
  }
  else if(e.code === "KeyD"){
    console.log("Right Turn Command Recieved");
    websocket.send(JSON.stringify({"Target_Theta": 1}));
    TurningHeading += 0.01;
  }
  else if(e.code === "KeyA"){
    console.log("Left Turn Command Recieved");
    websocket.send(JSON.stringify({"Target_Theta": -1}));
    TurningHeading -= 0.01;
  }
});


