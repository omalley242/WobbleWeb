import './App.css';
import MapContainer from './components/MapContainer/MapContainer';
import React, {useState} from 'react';
import ReactPolling from 'react-polling/lib/ReactPolling';

function App() {

  const [nodeData, updateNodeData] = useState([[]]);

  const fetchNodeData = () => {
    //location.host gives the server ip
    return fetch(`http://${window.location.host}/nodes`);
  }

  console.log(fetch(`http://${window.location.host}/nodes`));
  //Fetch all nodes from the database, on load


  //pass the data into the map container and create a component for each

  //use the data for css positioning

  //Repeat for each path

  //poll the database for changes

  //on change re-render the components within the container

  let data = [{content: "test"}];

  return (
    <div style={{display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignContent: 'center', padding: '0', margin: '0'}}>

      <div style={{display: 'inline-block', padding: 20}}>
        <MapContainer data={data}></MapContainer>
      </div>
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
