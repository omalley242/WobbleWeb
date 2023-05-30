import './App.css';
import MapContainer from './components/MapContainer/MapContainer';
import React, {useState} from 'react';
import ReactPolling from 'react-polling/lib/ReactPolling';

function App() {

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
    return fetch(`http://${window.location.host}/clear`);
  }

  return (
    <div style={{display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignContent: 'center', padding: '0', margin: '0'}}>
      <ReactPolling
      url={`http://${window.location.host}/nodes`}
      interval={3000}
      retryCount={2}
      onSuccess = {nodePollingSuccess}
      onFailure = {nodePollingFailure}
      promise = {fetchNodeData}

      render={({ startPolling, endPolling, isPolling }) => {
        return <ReactPolling 
                url = {`http://${window.location.host}/paths`}
                interval = {3000}
                retryCount = {2}
                onSuccess = {pathPollingSuccess}
                onFailure = {pathPollingFailure}
                promise = {fetchPathData}
                render = {({ startPolling, endPolling, isPolling }) => {
                  return <MapContainer nodeData={nodeData} pathData={pathData}></MapContainer>;
                }}
                />;
      }}
      />

      <div style={{display: 'inline-block', padding: '3%'}}>
        <label>IP Address</label>
        <br/>
        <input type="url" id='IpAddressForm'/>
        <br/>
        <input style={{marginTop: '10%', height: '5%', width: '100%'}}type='button' id='ClearButton' Class='Button' onClick={resetDatabase} value='Reset Database'/>
      </div>

    </div>
  );
}

export default App;
