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
const { app, BrowserWindow, ipcMain, session, screen, Menu } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
// const { machineIdSync } = require('node-machine-id');
const macaddress = require('macaddress');
const shell = require('shelljs');
const net = require('net');
const { execSync, spawn } = require('child_process');
const store = new Store();
    
let express = require('express'),
    config = require('./config/config'),
    glob = require('glob'),
    fs = require('fs'),
    sequelize = null,
    { Sequelize } = require('sequelize'),
    modbus = require('modbus-stream'),
    modbusConnection = null,
    modbusInterval = null,
    webServer = null,
    win = null,
    mongoPort = null,
    nodePort = null,
    webApp = null,
    logFilePath = null,
    macRE = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}\\.[0-9a-fA-F]{4}\\.[0-9a-fA-F]{4})$/;;

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

global.config = config;
global.noReadings = false;

const gotTheLock = app.requestSingleInstanceLock()
if(!gotTheLock) {
    app.quit();
    return;
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('ready', function() {
    global.macIds = []
    // macaddress.all().then(function(addresses) {
        execSync('ipconfig /all').toString().split('\r\n').forEach(item => {
            var matches = macRE.exec(item);
            if(matches && matches.length > 0) {
                var mac = matches[0].replace(/-/g, ':').toLowerCase();
                if(global.macIds.indexOf(mac) < 0) {
                    global.macIds.push(mac)
                }
            }
        });

        console.log(global.macIds);

        const size = screen.getPrimaryDisplay().workAreaSize;

        win = new BrowserWindow({
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
            minWidth: 600,
            icon: path.join(__dirname, 'icons/logo.png'),
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                webviewTag: true
            }
        });
        // win.webContents.openDevTools();
        win.loadURL(url.format({
            pathname: path.join(__dirname, 'electron/main.html'),
            protocol: 'file:',
            slashes: true
        }));
        win.on('closed', () => {
            win = null
        });
        startMongoNow();
    // });
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
    // shell.rm('-f', lockfile);
    sequelize = new Sequelize({
        dialect: 'sqlite',
        logging: false,
        storage: path.join(dataDir, 'database.sqlite3')
    });
    startNodeNow();

    /* freeport(function () {
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
    }); */
}

function startNodeNow() {

    webApp = express();
    webApp.sequelize = sequelize;

    var models = glob.sync(config.root + '/app/models/*.js');
    models.forEach(function (model, i) {
        require(model)(sequelize);
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

async function connectModubs(item) {
    return new Promise(function(resolve, reject) {
        const timout = setTimeout(function() {
            reject();
        }, 2000);
        modbus.tcp.connect(item.data.device.port, item.data.device.host, (err, connection) => {
            if(!err) {
                clearTimeout(timout);
                modbusConnection = connection;
                resolve();
                connection.on('error', function() {
                    console.log('error on connection');
                    disconnectModubs();
                    // connectModubs(item);
                })
            }
        });
    });
}

function disconnectModubs(item) {
    if(modbusConnection) {
        try {
            modbusConnection.close();
            modbusConnection = null;
        } catch(err) {}
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
    sequelize.models.Option.findOne({
        isDeleted: false,
        field: 'config'
    }).then(function(item) {
        if(!item) {
            printLog('Error fetching connection details')
            global.modbusServerRunning = true;
            sendToWin(win, 'webApp')
        } else {
            item = item.toJSON();
            item.data = JSON.parse(item.data);
            printLog(item.data.registers);

            global.modbusServerRunning = true;
            modbusInterval = setInterval(async function() {
                console.log('Interval started');
                try {
                    await connectModubs(item);
                    console.log('Modbus connected')
                } catch(err) {
                    console.log('Internal Error 1')
                    console.log(err)
                }
                console.log('Try catch ended');

                printLog('Running modbus')
                try {
                    var input = {
                        data: {},
                        raw: {}
                    }
                    var shouldInsert = false;
                    for(var i = 0; i < item.data.registers.length; i++) {
                        var register = item.data.registers[i];
                        try {
                            const readValue = await readRegister(5, register.address, register.type);
                            if(readValue != false) {
                                input.data[register.key] = convertValue(register, readValue) * (register.multiplier || 1);
                                console.log('read value', readValue);
                                console.log('converted value', input.data[register.key]);
                                if(convertValue(register, readValue) < 0) {
                                    input.data[register.key] = 0;
                                }
                                if(register.key == 'WIND_SPEED' && convertValue(register, readValue) < 0.06) {
                                    input.data[register.key] = 0;
                                }
                                input.raw[register.key] = readValue;
                                shouldInsert = true;
                            } else {
                                // input.data[register.key] = -1;
                                input.raw[register.key] = false;
                            }
                        } catch(err) {
                            console.log(err);
                        }
                    }
                    if(shouldInsert) {
                        printLog(JSON.stringify(input));
                        sequelize.models.Log.create({
                            createdAt: new Date(),
                            isDeleted: false,
                            data: JSON.stringify(input.data),
                            raw: JSON.stringify(input.raw)
                        }).then(function(_id) {
                            disconnectModubs();
                            global.noReadings = false;
                            sendToWin(win, 'newData', {
                                _id: _id.toString(),
                                createdAt: new Date(),
                                data: input.data,
                                raw: input.raw
                            });
                        }).catch(function(err) {});
                    } else {
                        console.log('Nothing to insert')
                        disconnectModubs();
                        global.noReadings = true;
                        sendToWin(win, 'readingStatus', 'off');
                    }
                } catch(err) {
                    console.log('Internal Error')
                    disconnectModubs();
                    global.noReadings = true;
                    sendToWin(win, 'readingStatus', 'off');
                }
            }, 2000)
            // }, item.data.device.interval * 1000)
            sendToWin(win, 'webApp')
        }
    }).catch(function(err) {
        printLog('Error fetching connection details')
        global.modbusServerRunning = true;
        sendToWin(win, 'webApp')
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
    if(win) {
        win.webContents.send(channel, data);
    }
}

async function readRegister(deviceId, address, type) {

    return new Promise(function(resolve) {
        try {
            if(modbusConnection) {
                let fn = 'readInputRegisters';
                if(type) {
                    switch(type) {
                        case 'input':
                            fn = 'readInputRegisters';
                            break;
                        case 'discrete':
                            fn = 'readDiscreteInputs';
                            break;
                        case 'coil':
                            fn = 'readCoils';
                            break;
                        case 'holding':
                            fn = 'readHoldingRegisters';
                            break;
                        default:
                            fn = 'readInputRegisters';
                            break;                            
                    }
                }
                modbusConnection[fn]({
                    address: parseInt(address) - 1,
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
            } else {
                resolve(false);
            }
        } catch(err) {
            resolve(false);
        }
    });
}

function convertValue(register, readValue) {
    return (parseInt(`0x${readValue}`) * 10 / 65536) - 5;
    // var diff = (register.values.max - register.values.min) / 65536;
    // return register.values.min + (parseInt(`0x${readValue}`) * diff);
}
function printLog() {
    // if(win) {
    //     sendToWin(win, 'console.log', arguments)
    // } else {
    //     console.log(arguments);
    // }
}