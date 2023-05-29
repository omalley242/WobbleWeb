import './MapContainer.css'
import Node from '../../node.svg'; 
const MapContainer = ({data}) => {
   
    console.log(data);
    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = data.map((item, index) => (
        <div key={index} className='Map-Item' style={{position: 'absolute', left: item.X_Pos, bottom: item.Y_Pos}}>
            <img style={{height: 50, width: 50}}src={Node} alt="Node Icon">{item.Con_Num}</img>            
        </div>
    ));

    return (
        <div className='Map-Container' style={{display: 'flex', position: 'relative', height: 800, width: 1000, flexWrap: 'wrap', border: '3px solid #222', margin: 50}}>
            {MapItems}
        </div>
    )
}

export default MapContainer;
