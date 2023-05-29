import './MapContainer.css'
import {ReactComponenet as Node} from '../../node.svg'; 
const MapContainer = ({data}) => {
   
    console.log(data);
    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = data.map((item, index) => (
        <div key={index} className='Map-Item' style={{position: 'absolute', left: item.X_Pos, bottom: item.Y_Pos}}>
            <Node >{item.Con_Num}</Node>            
        </div>
    ));

    return (
        <div className='Map-Container' style={{display: 'flex', position: 'relative', height: 800, width: 1000, flexWrap: 'wrap', border: '3px solid #222', margin: 50}}>
            {MapItems}
        </div>
    )
}

export default MapContainer;
