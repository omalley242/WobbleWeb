import './App.css';
import MapContainer from './components/MapContainer/MapContainer';
import React, {useState} from 'react';
import ReactPolling from 'react-polling/lib/ReactPolling';

function App () {
  
  //define the inital states of the nodeData and its updated verion
  const [nodeData, updateNodeData] = useState([]);
  const [pathData, updatePathData] = useState([]);

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
            DistDiv.innerHTML = integer.valueOf(text).toFixed(3);
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
                  return <MapContainer nodeData={nodeData} pathData={pathData}></MapContainer>;
                }}
                />;
      }}
      />

      <div style={{display: 'inline-block', padding: '1vh', width: '15%', height: '15%'}}>
          <input style={{marginTop: '4vh', height: '100%', width: '100%'}} type='button' id='ClearButton' Class='Button' onClick={resetDatabase} value='Reset Database'/>

          <input style={{marginTop: '4vh', height: '100%', width: '100%'}} type='button' id='DijkstraButton' Class='Button' onClick={runDijkstras} value='Run Dijkstras'/>

          <div style={{marginTop: '4vh', width: '100%', alignContent: 'center', height: '30%', backgroundColor: '#777', border: '1px solid #333', fontSize: '0.7em'}} id='distanceDiv'> </div>
      </div>


    </div>
  );
}

export default App;
