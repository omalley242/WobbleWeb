import './App.css';
import MapContainer from './components/MapContainer/MapContainer';
import React, {useState, useEffect} from 'react';
import ReactPolling from 'react-polling/lib/ReactPolling';

function App () {
  
  //define the inital states of the nodeData and its updated verion
  const [nodeData, updateNodeData] = useState([]);
  const [pathData, updatePathData] = useState([]);
  const [websocketData, updateWebsocketData] = useState([]);

  useEffect(() => {
    let websocket = new WebSocket("ws://" + window.location.host + "/ManualControl", "ManualControl");

    websocket.onmessage = (message) => {
      console.log(JSON.stringify(message.data.text()));
      // console.log(JSON.parse(websocketData.data));
      updateWebsocketData(message);    
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
    console.log(websocketData);

    return () => null;
  }, []);


  const fetchPathData = () => {
    //location.host gives the server ip
    return fetch(`http://${window.location.host}/paths`);
  }

  const fetchNodeData = () => {
    //location.host gives the server ip
    return fetch(`http://${window.location.host}/nodes`);
  }

  //Function to call on a successful database poll (update component data)
  const pathPollingSuccess = (jsonResponse) => {
    updatePathData(jsonResponse);
    return true;
  }
  
  //Function to call on a successful database poll (update component data)
  const nodePollingSuccess = (jsonResponse) => {
    updateNodeData(jsonResponse);
    return true;
  }
  
  //Function to call on failuer of database poll (dont update but dont throw err)
  const pathPollingFailure = () => {
    console.log("Polling of database failed");
    return true;
  }

  //Function to call on failuer of database poll (dont update but dont throw err)
  const nodePollingFailure = () => {
    console.log("Polling of database failed");
    return true;
  }

  const resetDatabase = () => {
    return fetch(`http://${window.location.host}/clear`).then(fetchNodeData).then(fetchPathData);
  }

  const runDijkstras = () => {
    fetch(`http://${window.location.host}/dijkstras`).then(Response => {
        Response.text().then(text => {
            console.log(text);
            var DistDiv = document.getElementById("distanceDiv");
            DistDiv.innerHTML = parseInt(text).toFixed(3);
            return text;
        });
    });
  }

  return (
    <div style={{display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignContent: 'center', padding: '0', margin: '0'}}>
      <ReactPolling
      url={`http://${window.location.host}/nodes`}
      interval={250}
      retryCount={2}
      onSuccess = {nodePollingSuccess}
      onFailure = {nodePollingFailure}
      promise = {fetchNodeData}

      render={() => {
        return <ReactPolling 
                url = {`http://${window.location.host}/paths`}
                interval = {500}
                retryCount = {2}
                onSuccess = {pathPollingSuccess}
                onFailure = {pathPollingFailure}
                promise = {fetchPathData}
                render = {() => {
                  return <MapContainer nodeData={nodeData} pathData={pathData} websocketData={websocketData}></MapContainer>;
                }}
                />;
      }}
      />

      <div style={{display: 'inline-block', padding: '1vh', width: '15%', height: '15%'}}>
          <input style={{marginTop: '4vh', height: '100%', width: '100%'}} type='button' id='ClearButton' Class='Button' onClick={resetDatabase} value='Reset Database'/>

          <input style={{marginTop: '4vh', height: '100%', width: '100%'}} type='button' id='DijkstraButton' Class='Button' onClick={runDijkstras} value='Run Dijkstras'/>

          <div style={{marginTop: '4vh', textAlign: 'center', fontSize: '1.3vw'}}>Shortest Path Length:</div>
          <div style={{width: '100%', textAlign:'center', height: '30%', backgroundColor: '#777', border: '1px solid #333', fontSize: '0.7em'}} id='distanceDiv'> </div>
      </div>


    </div>
  );
}

export default App;
