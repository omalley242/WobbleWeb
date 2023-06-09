import './MapContainer.css'
import Xarrow, { Xwrapper } from 'react-xarrows';
import React from 'react';

    //Setup WebSocket to the server

const MapContainer = ({nodeData, pathData, websocketData}) => {


    function setEndNode(id) {
        // document.getElementById(id + "svg").style.fill = "blue";
        fetch(`http://${window.location.host}/setEndNode?nodeId=${id}`);
    }

    //a constant function that takes an input "data" and returns a list of Map-Item elements with a surronding div, called Map-Container
    const MapItems = nodeData.map((item, index) => ( 
        <div key={index} id={item.Id} className='Map-Item' style={{height: '1vw', width: '1vw', position: 'absolute', left: `${item.XCoordinate / 3.6}%`, bottom: `${item.YCoordinate / 2.4}%`}} onClick={() => setEndNode(item.Id)}>
            <svg id={item.Id + "svg"} class='node' viewBox="0 0 24 24" fill={item.Colour} xmlns="http://www.w3.org/2000/svg">
                <path class='node-path' opacity="0.1" fill-rule="evenodd" clip-rule="evenodd" d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM15.7609 10.8247C15.7556 10.7539 15.7204 10.6858 15.6585 10.6408L12.1709 8.10695C12.167 8.10412 12.1631 8.10142 12.1591 8.09885C12.0733 8.02797 11.9473 8.02107 11.8531 8.08952L8.39403 10.6027L8.39186 10.6033C8.26055 10.646 8.18869 10.7871 8.23135 10.9184L9.5735 15.0491C9.60024 15.1314 9.6656 15.1903 9.74299 15.2123C9.7813 15.2362 9.82654 15.25 9.875 15.25H14.15C14.1548 15.25 14.1596 15.2499 14.1643 15.2496C14.2754 15.2565 14.3814 15.188 14.4174 15.0773L15.7553 10.9595C15.77 10.9143 15.7711 10.8678 15.7609 10.8247Z" fill="#323232"/>
                <path class='node-path' d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#323232" stroke-width="2"/>
                <path class='node-path' d="M3.6001 15H14.1501" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class='node-path' d="M6.55127 4.93823L9.8114 14.9719" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class='node-path' d="M17.0322 4.6355L8.4971 10.8366" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class='node-path' d="M20.5591 14.5104L12.024 8.30924" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class='node-path' d="M12.2573 20.9159L15.5175 10.8822" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>                   
        </div>
    ));

    function Dot (websocketData) {
        return <span style={{position: 'absolute', height: "15px", width: "15px", backgroundColor: "#bbb", borderRadius: "50%", display: "inline-block", left: `${websocketData.X / 3.6}%`, bottom: `${websocketData.Y / 2.4}%`}}></span>
    }

    console.log(websocketData);
    const websocketItems = Dot(websocketData);

    // A function that creates all the paths
    const PathItems = pathData.map((item) => {
            return <Xarrow 
            start={item.StartId.toString()}
            end={item.EndId.toString()}
            curveness={0.1}
            strokeWidth={2}
            color={item.Colour}
            headSize={0}
            animateDrawing={true}
            labels=<div style={{ fontSize: "0.4em", fontFamily: "monospace", fontStyle: "italic" }}>{item.Distance.toString()}</div>
            />;
        });

    const PathTextBox = pathData.map((item) => {
        return <div style={{backgroundColor: '#777', border: '1px solid #333', fontSize: '0.7em'}}>
                    <div style={{backgroundColor: '#666'}}>
                        {"--- Path ---"}
                    </div>
                    {"StartId: " + item.StartId.toString() + "\n"}
                    {"EndId: " + item.EndId.toString()+ "\n"}
                    {"Distance: " + item.Distance.toString()+ "\n"}
                </div>;
    });

    const NodeTextBox = nodeData.map((item) => {
        return <div style={{backgroundColor: '#777', border: '1px solid #333', fontSize: '0.7em'}}>
                    <div style={{backgroundColor: '#666'}}>
                        {"--- Node ---"}
                    </div>
                    {"StartId: " + item.Id.toString() + "\n"}
                    {"PosX: " + item.XCoordinate.toString()+ "\n"}
                    {"PosY: " + item.YCoordinate.toString()+ "\n"}
                </div>;
    });
    


    return (
        <div className='Map-Container' style={{border: '3px solid #222', margin: '5vh', backgroundColor: '#444', maxHeight: '90vh'}}>
            <div style= {{height: '40vw', width: '60vw', position: 'relative'}}>
                    <svg height="1vw" width="1vw" style={{position: 'absolute', left: '0%', top: '0%'}}>
                        <circle cx="0.3vw" cy="0.3vw" r="0.5vw" stroke="black" stroke-width="3" fill="blue" />
                    </svg>                     
                    <svg height="1vw" width="1vw" style={{position: 'absolute', left: '98.5%', top: '0%'}}>
                        <circle cx="0.7vw" cy="0.3vw" r="0.5vw" stroke="black" stroke-width="3" fill="red" />
                    </svg>                     
                    <svg height="1vw" width="1vw" style={{position: 'absolute', left: '0%', top: '97.5%'}}>
                        <circle cx="0.3vw" cy="0.7vw" r="0.5vw" stroke="black" stroke-width="3" fill="orange" />
                    </svg>                     
                <Xwrapper>
                    {PathItems}
                    {MapItems}
                    {websocketItems}
                </Xwrapper>
            </div>
            <div style={{overflowY: 'scroll', overflowX: 'hidden', width: '100%', maxHeight: '14vw', border: '2px solid #222'}}>
                {PathTextBox}
                {NodeTextBox}
            </div>
        </div>

    )
}

export default MapContainer;
