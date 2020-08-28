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
const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');
const store = new Store();
    
let express = require('express'),
    config = require('./config/config'),
    glob = require('glob'),
    mongoose = require('mongoose'),
    modbus = require('modbus-stream'),
    modbusConnection = null,
    modbusInterval = null,
    webServer = null,
    win = null;

console.log('defining templates');

const template = [
    {
        label: 'Main',
        click() {
        	win.loadURL(`file://${__dirname}/electron/main.html`);
        }
    }
]

if (process.platform === 'darwin') {
    const name = app.getName()
    template.unshift({
        label: name,
        submenu: [{
            role: 'quit'
        }]
    })
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

global.macId = machineIdSync().substr(0, 16);
global.config = config;

app.on('ready', function() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            webviewTag: true
        }
    });
    win.webContents.openDevTools();
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'electron/main.html'),
        protocol: 'file:',
        slashes: true
    }));
    win.on('closed', () => {
        win = null
    });
});
app.on('window-all-closed', () => {
    closeApp();
})

function closeApp() {
    console.log(arguments)
    app.quit();
}


// Starting Web Portion

ipcMain.on('startWebApp', startWebApp);
ipcMain.on('stopWebApp', stopWebApp);
ipcMain.once('startModbus', startModbus);
ipcMain.on('stopModbus', stopModbus);
ipcMain.on('closeApp', closeApp);

mongoose.Promise = global.Promise;

connectMongo();

mongoose.connection.on('disconnected', connectMongo);

function connectMongo() {
    mongoose.connect(config.database, {
        useCreateIndex: true,
        useNewUrlParser: true
    });
}

var webApp = express();

var models = glob.sync(config.root + '/app/models/*.js');
models.forEach(function (model, i) {
    require(model);
});

require('./config/express')(webApp, config);

function startWebApp() {
    if(!webServer || !webServer.listening) {
        webServer = webApp.listen(config.port, config.host, function () {
            global.webServerRunning = true;
            console.log('Express server listening on http://' + config.host + ':' + config.port);
            sendToWin(win, 'webApp')
        });
    } else {
        global.webServerRunning = true;
        sendToWin(win, 'webApp')
    }
}

function stopWebApp() {
    if(webServer && webServer.listening) {
        webServer.close();
        console.log('Server closed.');
        global.webServerRunning = false;
        sendToWin(win, 'webApp')
    } else {
        global.webServerRunning = false;
        sendToWin(win, 'webApp')
    }
}

function startModbus(restart) {
    if(restart) {
        try {
            modbusConnection.close();
        } catch(err) {}
    }
    try {
        clearInterval(modbusInterval);
    } catch(err) {}
    mongoose.models.Option.findOne({
        isDeleted: false,
        field: 'config'
    }).exec(function(err, item) {
        if(err || !item) {
            console.log('Error fetching connection details')
            global.modbusServerRunning = false;
            sendToWin(win, 'webApp')
        } else {
            modbus.tcp.connect(item.data.device.port, item.data.device.host, (err, connection) => {
                modbusConnection = connection;
            });

            global.modbusServerRunning = true;
            modbusInterval = setInterval(async function() {

                console.log('Running modbus')
                var input = {
                    data: {},
                    raw: {}
                }
                for(var i = 0; i < item.data.registers.length; i++) {
                    var register = item.data.registers[i];
                    try {
                        const readValue = await readRegister(5, register.address);
                        if(readValue != false) {
                            input.data[register.key] = convertValue(register, readValue);
                            input.raw[register.key] = readValue;
                        } else {
                            input.data[register.key] = -1;
                            input.raw[register.key] = false;
                        }
                    } catch(err) {

                    }
                }
                console.log(JSON.stringify(input));
                new mongoose.models.Log({
                    createdAt: new Date(),
                    data: input.data,
                    raw: input.raw
                }).save();
            }, item.data.device.interval * 1000)
            sendToWin(win, 'webApp')
        }
    })
}

function stopModbus() {
    try {
        modbusConnection.close();
    } catch(err) {}
    try {
        clearInterval(modbusInterval);
    } catch(err) {}
    modbusConnection = null;
    global.modbusServerRunning = false;
    sendToWin(win, 'webApp')
}

function sendToWin(win, channel) {
    win.webContents.send(channel);
}

async function readRegister(deviceId, address) {

    return new Promise(function(resolve) {
        
        modbusConnection.readInputRegisters({
            address: address,
            quantity: 1,
            extra: {
                unitId: deviceId
            }
        }, function(err, resp) {
            if(!err) {
                resolve(resp.response.data[0].toString('hex'))
            } else {
                resolve(false);
            }
        })
    });
}

function convertValue(register, readValue) {
    var diff = (register.values.max - register.values.min) / 65536;
    return register.values.min + (parseInt(`0x${readValue}`) * diff);
}