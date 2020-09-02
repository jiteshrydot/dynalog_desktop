const { MSICreator } = require('electron-wix-msi');
const path = require('path');

const APP_DIR = path.join(__dirname, './Dynalog-win32-x64');
const OUT_DIR = path.join(__dirname, './installer');

const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    outputDirectory: OUT_DIR,
    description: 'Modbus TCP/IP register reader',
    exe: 'Dynalog',
    name: 'Dynalog',
    manufacturer: 'RyDOT Infotech Pvt Ltd',
    version: '1.0.2',
    ui: {
        chooseDirectory: true
    }
})
msiCreator.create().then(function() {
    msiCreator.compile();
})