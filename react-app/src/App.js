import './App.css';
import MapContainer from './components/MapContainer/MapContainer';

function App() {

  let data = [];
  for(let i=0; i< 3025; i++){
    data.push({content: ""});
  }

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
