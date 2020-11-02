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
var mongoose = require('mongoose'),
    { Op } = require('sequelize'),
    responder = require('../../libs/responder');

module.exports = {
    get: get,
    download: download
};

async function get(req, res, next) {
    var limit = parseInt(req.body.limit) || 10;
    var skip = parseInt(req.body.skip) || 0;
    var startDate = req.body.fromDate || '';
    var endDate = req.body.toDate || '';

    var where = {
        isDeleted: false,
        data: {
            [Op.not]: null
        },
        createdAt: {}
    };

    try {
        var start = new Date(startDate);
        var end = new Date(endDate);
        if(isNaN(start))
            start = new Date(0)
        if(isNaN(end))
            end = new Date()
        where.createdAt = {
            [Op.between]: [start, end]
        }
    } catch(ex) {}

    req.app.sequelize.models.Log.findAndCountAll({
        where: where,
        order: [
            ['createdAt', 'DESC']
        ],
        offset: skip,
        limit: limit
    }).then(function (result) {
        return responder.success(res, {
            list: result.rows.map(function(row) {
                return {
                    data: JSON.parse(row.data),
                    createdAt: row.createdAt
                }
            }),
            count: result.count
        });
    }).catch(function(err) {
        return handleInternalError(res, err, next);
    });
}

async function download(req, res, next) {
    var startDate = req.body.fromDate || '';
    var endDate = req.body.toDate || '';
    var keys = req.body.keys || [];
    var tzOffset = (-1) * parseInt(req.headers['x-time-zone']) * 60000;

    var where = {
        isDeleted: false,
        data: {
            [Op.not]: null
        },
        createdAt: {}
    };

    try {
        var start = new Date(startDate);
        var end = new Date(endDate);
        if(isNaN(start))
            start = new Date(0)
        if(isNaN(end))
            end = new Date()
        where.createdAt = {
            [Op.between]: [start, end]
        }
    } catch(ex) {}

    req.app.sequelize.models.Log.findAll({
        where: where,
        order: [
            ['createdAt', 'DESC']
        ]
    }).then(function (items) {
        var text = ``;//`createdAt,${keys.join(',')}`;
        items.map(function(item) {
            return {
                createdAt: item.createdAt,
                data: JSON.parse(item.data)
            }
        }).forEach(function(item) {
            text += `\n${new Date(item.createdAt.getTime() + tzOffset).toISOString().substring(0, 19).replace('T', ' ')},` + keys.map(function(key) {
                return item.data[key] || '';
            }).join(',');
        });
        return responder.success(res, {
            text: text
        });
    }).catch(function(err) {
        return handleInternalError(res, err, next);
    });
}