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

//Keydown Handler
window.addEventListener(
  "keydown",
  (event) => {
    //Only send on inital press not repitions
    if(event.repeat){
      return;
    }

    //on keypress set the current key to true within the dictionary
    keys[event.key] = true;

    console.log("Setting " + event.key + " to true");

    //do any key checking within this section
    add_movement_listener("w", {forward: true});
    add_movement_listener("a", {left: true});
    add_movement_listener("s", {back: true});
    add_movement_listener("d", {right: true});

  },
  true
);

//Keyup Handler
window.addEventListener(
  "keyup",
  (event) => {
    //on key release set the current key to false within the dictionary
    keys[event.key] = false;

    console.log("Setting " + event.key + " to false");

    add_movement_listener("w", {forward: false});
    add_movement_listener("a", {left: false});
    add_movement_listener("s", {back: false});
    add_movement_listener("d", {right: false});

  },
  true
);

//Make a HTTP request
async function HttpRequest(url = "", data = {}) {

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response;
  }catch (err){
    console.log("A network error occoured")
  }


}

//Add a template for direction and distance for each keypress
async function add_movement_listener(key, message = {}) {
  if(keys[key] === true) {
    let IpAddress = document.getElementById("IpAddressForm").value;
    let response = HttpRequest("http://" + IpAddress, message);
    console.log(response);
  }
}
