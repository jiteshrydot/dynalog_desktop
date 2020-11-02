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
var sequelize = require('sequelize'),
    responder = require('../../libs/responder'),
    ipcMain = require('electron').ipcMain;

module.exports = {
    get: get,
    put: put
};

async function get(req, res, next) {
    req.app.sequelize.models.Option.findOne({
        isDeleted: false,
        field: 'config'
    }).then(function(item) {
        if(!item) {
            req.app.sequelize.models.Option.create({
                isDeleted: false,
                field: 'config',
                data: JSON.stringify({
                    dateFormat: 'medium',
                    deviceId: 5,
                    addressLength: 1,
                    device: {
                        host: '',
                        port: 0,
                        interval: 60
                    },
                    registers: []
                })
            }).then(function(item) {
                return responder.success(res, {
                    item: JSON.parse(item.data)
                });
            }).catch(function(err) {
                return responder.handleInternalError(res, err, next);
            });
        } else {
            return responder.success(res, {
                item: JSON.parse(item.data)
            });
        }
    }).catch(function(err) {
        return responder.handleInternalError(res, err, next);
    });
}

async function put(req, res, next) {
    var data = {};
    data.dateFormat = req.body.dateFormat;
    data.deviceId = req.body.deviceId;
    data.addressLength = req.body.addressLength;
    data.device = req.body.device;
    data.registers = req.body.registers;

    console.log(data)
    console.log(JSON.parse(JSON.stringify(await req.app.sequelize.models.Option.findAll())));
    req.app.sequelize.models.Option.update({
        data: JSON.stringify(data)
    }, {
        where: {
          field: 'config'
        }
    }).then(function(item) {
        console.log(item)
        ipcMain.emit('updateConfig', JSON.stringify({
            field: 'config',
            data: data
        }));
        ipcMain.emit('restartModbus', true);
        return responder.success(res, {});
    }).catch(function(err) {
        return responder.handleInternalError(res, err, next);
    });
}