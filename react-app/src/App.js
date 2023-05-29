import './App.css';
import MapContainer from './components/MapContainer/MapContainer';
import React, {useState} from 'react';
import ReactPolling from 'react-polling/lib/ReactPolling';

function App() {

  //define the inital states of the nodeData and its updated verion
  const [nodeData, updateNodeData] = useState([{}]);

  const fetchNodeData = () => {
    //location.host gives the server ip
    return fetch(`http://${window.location.host}/nodes`);
  }

  //Function to call on a successful database poll (update component data)
  const pollingSuccess = (jsonResponse) => {

    updateNodeData(jsonResponse);
    return true;
  }
  

  //Function to call on failuer of database poll (dont update but dont throw err)
  const pollingFailure = () => {
    console.log("Polling of database failed");
    return true;
  }

  return (
    <div style={{display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignContent: 'center', padding: '0', margin: '0'}}>
      <ReactPolling
      url={`http://${window.location.host}/nodes`}
      interval={500}
      retryCount={2}
      onSuccess = {pollingSuccess}
      onFailure = {pollingFailure}
      promise = {fetchNodeData}

      render={({ startPolling, endPolling, isPolling }) => {
        return <MapContainer nodeData={nodeData}></MapContainer>;
      }}
      />

      <div style={{display: 'inline-block', padding: 20}}>
        <label>
          IP Address
        </label>
        <br/>
        <input type="url" id='IpAddressForm'>
        </input>
        <div>

        </div>
      </div>
    </div>
  );
}

export default App;
