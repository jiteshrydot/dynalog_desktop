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
// const { machineIdSync } = require('node-machine-id');
const getmac = require('getmac');
const shell = require('shelljs');
const net = require('net');
const spawn = require('child_process').spawn;
const store = new Store();
    
let express = require('express'),
    config = require('./config/config'),
    glob = require('glob'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    modbus = require('modbus-stream'),
    modbusConnection = null,
    modbusInterval = null,
    webServer = null,
    win = null,
    mongoPort = null,
    nodePort = null,
    webApp = null,
    logFilePath = null;

printLog('defining templates');

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

const menu = Menu.buildFromTemplate([])
Menu.setApplicationMenu(menu)

global.macId = getmac.default();
global.config = config;

app.on('ready', function() {
    win = new BrowserWindow({
        width: 960,
        minWidth: 960,
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
    startMongoNow();
});
app.on('window-all-closed', () => {
    closeApp();
})

function closeApp() {
    printLog(arguments)
    app.quit();
}


// Starting Web Portion

ipcMain.on('startWebApp', startWebApp);
ipcMain.on('stopWebApp', stopWebApp);
ipcMain.once('startModbus', startModbus);
ipcMain.on('updateConfig', function(data) {
    if(logFilePath) {
        var text = `${new Date().toString()}\t[Update Config]\t${data}\n`;
        fs.appendFileSync(logFilePath, text);
    }
});
ipcMain.on('restartModbus', function() {
    printLog('=================================================================');
    printLog('RESTARTING');
    printLog('=================================================================');
    startModbus(true);
});
ipcMain.on('stopModbus', stopModbus);
ipcMain.on('closeApp', closeApp);

function startMongoNow() {
    printLog('trying to start mongod process');
    let mongoExe = null;
    let dataDir = null;
    if(app.isPackaged) {
        mongoExe = path.join(process.execPath, '../bin', 'mongod.exe');
        dataDir = path.join(app.getPath('userData'), 'Mongoclient', 'db');
        logFilePath = path.join(process.execPath, '../logs.txt');
    } else {
        mongoExe = path.join(__dirname, 'bin', 'mongod.exe');
        dataDir = path.join(process.env.APPDATA, 'Mongoclient', 'db');
        logFilePath = path.join(__dirname, 'logs.txt');
    }
    let lockfile = path.join(dataDir, 'mongod.lock');

    printLog('detected mongod data directory: ' + dataDir);
    printLog('trying to create data dir and removing mongod.lock just in case');
    shell.mkdir('-p', dataDir);
    shell.rm('-f', lockfile);

    freeport(function () {
        printLog('trying to spawn mongod process with port: ' + mongoPort);
        mongoProcess = spawn(mongoExe, [
            '--dbpath', dataDir,
            '--port', mongoPort,
            '--bind_ip', '127.0.0.1'
        ]);

        mongoProcess.stdout.on('data', function (data) {
            // printLog('[MONGOD-STDOUT]', data.toString());

            if (/waiting for connections/.test(data.toString())) {
                startNodeNow();
            }
        });

        mongoProcess.stderr.on('data', function (data) {
            // console.error('[MONGOD-STDERR]', data.toString());
            startMongoNow();
        });

        mongoProcess.on('exit', function (code) {
            // printLog('[MONGOD-EXIT]', code.toString());
        });
    });
}

function startNodeNow() {
    mongoose.Promise = global.Promise;

    connectMongo();

    mongoose.connection.on('disconnected', connectMongo);

    function connectMongo() {
        mongoose.connect(`mongodb://127.0.0.1:${mongoPort}/dynalog`, {
            useCreateIndex: true,
            useNewUrlParser: true
        });
    }

    webApp = express();

    var models = glob.sync(config.root + '/app/models/*.js');
    models.forEach(function (model, i) {
        require(model);
    });

    require('./config/express')(webApp, config);
    startWebApp()
}

function freeport(done) {
    printLog('trying to find free port for spawn');
    mongoPort = mongoPort || 11235;
    const socket = new net.Socket()
        .once('connect', function () {
            socket.destroy();
            ++mongoPort
            freeport(done);
        })
        .once('error', function (/* err */) {
            socket.destroy();
            done(mongoPort);
        })
        .connect(mongoPort, '127.0.0.1');
}

function freeportNode(done) {
    printLog('trying to find free port for spawn');
    nodePort = nodePort || 8080;
    const socket = new net.Socket()
        .once('connect', function () {
            socket.destroy();
            ++nodePort
            freeport(done);
        })
        .once('error', function (/* err */) {
            socket.destroy();
            done(nodePort);
        })
        .connect(nodePort, '127.0.0.1');
}

function startWebApp() {
    if(!webServer || !webServer.listening) {
        freeportNode(function(){
            webServer = webApp.listen(nodePort, config.host, function () {
                global.webServerRunning = true;
                global.nodePort = nodePort;
                printLog('Express server listening on http://' + config.host + ':' + nodePort);
                sendToWin(win, 'webApp')
                startModbus();
            });
        });
    } else {
        global.webServerRunning = true;
        sendToWin(win, 'webApp')
    }
}

function stopWebApp() {
    if(webServer && webServer.listening) {
        webServer.close();
        printLog('Server closed.');
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
            printLog('connection closed')
        } catch(err) {}
    }
    try {
        clearInterval(modbusInterval);
        printLog('interval closed')
    } catch(err) {}
    mongoose.models.Option.findOne({
        isDeleted: false,
        field: 'config'
    }).exec(function(err, item) {
        if(err || !item) {
            printLog('Error fetching connection details')
            global.modbusServerRunning = true;
            sendToWin(win, 'webApp')
        } else {
            printLog(item.data.registers);
            modbus.tcp.connect(item.data.device.port, item.data.device.host, (err, connection) => {
                modbusConnection = connection;
            });

            global.modbusServerRunning = true;
            modbusInterval = setInterval(async function() {

                printLog('Running modbus')
                try {
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
                    printLog(JSON.stringify(input));
                    new mongoose.models.Log({
                        createdAt: new Date(),
                        data: input.data,
                        raw: input.raw
                    }).save();
                } catch(err) {}
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

function sendToWin(win, channel, data) {
    win.webContents.send(channel, data);
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
function printLog() {
    // if(win) {
    //     sendToWin(win, 'console.log', arguments)
    // } else {
    //     console.log(arguments);
    // }
}