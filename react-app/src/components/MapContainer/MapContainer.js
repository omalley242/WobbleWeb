import './MapContainer.css'

const MapContainer = ({data}) => {
   
    let container_width = 1024 + 256;
    let item_size = (container_width / Math.sqrt(data.length)) - 2;

    console.log(container_width + " " + data.length);
    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = data.map((item, index) => (
        <div key={index} className='Map-Item' style={{height: item_size, width: item_size}}>
            {item.content}
        </div>
    ));

    return (
        <div className='Map-Container' style={{display: 'flex', width: container_width, flexWrap: 'wrap'}}>
            {MapItems}
        </div>
    )
}

export default MapContainer;
