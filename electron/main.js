/**
 * Copyright (C) 2020 RyDOT Infotech Pvt. Ltd - All Rights Reserved
 *
 * CONFIDENTIAL
 *
 * All information contained herein is, and remains the property of RyDOT Infotech Pvt. Ltd and its partners,
 * if any. The intellectual and technical concepts contained herein are proprietary to RyDOT Infotech Pvt. Ltd and its
 * partners and may be covered by their and Foreign Patents, patents in process, and are protected by trade secret or
 * copyright law. Dissemination of this information or reproduction of this material is strictly forbidden unless
 * prior written permission is obtained from RyDOT Infotech Pvt. Ltd.
**/
var remote = require('electron').remote;
var ipc = require('electron').ipcRenderer;
var statusDiv = document.getElementById('status');

initApp();

ipc.on('webApp', initApp)

function initApp() {
    if(remote.getGlobal('macId') !== remote.getGlobal('config').macId) {
        alert('This application is not compatible with this device');
        ipc.send('closeApp')
    }
    // let nodeJSPortion = ``;
    if(remote.getGlobal('webServerRunning')) {
        // nodeJSPortion = `<div>
        //     Web server is running on Port: ${remote.getGlobal('nodePort')}
        //     <br> Click <a href="http://localhost:${remote.getGlobal('nodePort')}" target="_blank">here to open</a>
        //     <button onclick="return stopWebApp();">Stop</button>
        // </div>`;
    } else {
        nodeJSPortion = `<div>
            Web server is not running
            <button onclick="return startWebApp();">Start</button>
        </div>`;
    }
    
    let modbusPortion = ``;
    if(remote.getGlobal('modbusServerRunning')) {
        modbusPortion = `<div>
            Modbus Script Running
            <button onclick="return stopModbus();">Stop</button> 
            <button onclick="return startModbus(true);">Restart</button> 
        </div>`;
    } else {
        modbusPortion = `<div>
            Modbus Script is not running
            <button onclick="return startModbus();">Start</button>
        </div>`;
    }

    const html = '' + nodeJSPortion + modbusPortion;

    // statusDiv.innerHTML = html;

    if(remote.getGlobal('webServerRunning') && remote.getGlobal('modbusServerRunning')) {
        location.href = `http://localhost:${remote.getGlobal('nodePort')}`;
    }

}

function startWebApp() {
    ipc.send('startWebApp', Date.now());
    return false;
}

function stopWebApp() {
    ipc.send('stopWebApp', Date.now());
    return false;
}

function startModbus(restart) {
    ipc.send('startModbus', restart);
    return false;
}

function stopModbus() {
    ipc.send('stopModbus');
    return false;
}