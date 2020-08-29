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
var path = require('path'),
    rootPath = path.normalize(__dirname + '/..');

module.exports = {
    uploadPath: rootPath + '/uploads/',
    root: rootPath,
    app: {
        name: 'dynalog-server',
        secret: '8p7nWGDUYeaw3IbaJorHth8g0r23AEOo'
    },
    database: 'mongodb://localhost/dynalog',
    port: 9133,
    macId: '68:5b:35:93:11:28',
    host: '0.0.0.0'
};