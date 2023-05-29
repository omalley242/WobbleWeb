import './MapContainer.css'

const MapContainer = ({data}) => {
   
    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = data.map((item, index) => (
        <div key={index} className='Map-Item' style={{}}>
            {item.content}
        </div>
    ));

    return (
        <div className='Map-Container' style={{display: 'flex', flexWrap: 'wrap', border: '3px solid #222'}}>
            {MapItems}
        </div>
    )
}

export default MapContainer;
