import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
//Render the main page
const root = ReactDOM.createRoot(document.getElementById('root'));

var websocket = new WebSocket("ws://" + window.location.host + "/ManualControl", "ManualControl");


root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);




