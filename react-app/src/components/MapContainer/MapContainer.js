import './MapContainer.css'

const MapContainer = ({data}) => {
   
    console.log(data);
    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = data.map((item, index) => (
        <div key={index} className='Map-Item' style={{position: 'absolute', left: item.X_Pos, bottom: item.Y_Pos}}>
            <svg>
                <circle style={{height: 20, width: 20}}> {item.Con_Num}</circle>
            </svg>
        </div>
    ));

    return (
        <div className='Map-Container' style={{display: 'flex', position: 'relative', height: 800, width: 1000, flexWrap: 'wrap', border: '3px solid #222'}}>
            {MapItems}
        </div>
    )
}

export default MapContainer;
