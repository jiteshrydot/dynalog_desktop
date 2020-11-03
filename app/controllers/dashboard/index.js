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
const { Op } = require('sequelize'),
    responder = require('../../libs/responder');

module.exports = {
    get: get,
    timeline: timeline
};

async function get(req, res, next) {

    var where = {
        data: {
            [Op.not]: null
        }
    };
    var order = [
        ['createdAt', 'DESC']
    ]
    req.app.sequelize.models.Log.findOne({
        where: where,
        order: order
    }).then(function (item) {

        if(item) {
            return responder.success(res, {
                item: JSON.parse(item.data),
                createdAt: item.createdAt,
                noReadings: global.noReadings
            });
        } else {
            return responder.success(res, {
                item: {},
                noReadings: global.noReadings
            });
        }
    }).catch(function(err) {
        return handleInternalError(res, err, next);
    });
}

async function timeline(req, res, next) {

    var fromDate = req.body.fromDate || '';
    var toDate = req.body.toDate || '';
    var tzOffset = (-1) * parseInt(req.headers['x-time-zone']) * 60000;
    if(!fromDate || !toDate) {
        return responder.success(res, {
            list: []
        })
    }
    var where = {
        isDeleted: false,
        data: {
            [Op.not]: null
        },
        createdAt: {
            [Op.between]: [new Date(fromDate), new Date(toDate)]
        }
    };
    req.app.sequelize.models.Log.findAll({
        where: where,
        group: ['createdAt'],
        order: [
            ['createdAt', 'ASC']
        ]
    }).then(function(items) {
        var out = [];
        items.forEach(function(item) {
            var parsed = JSON.parse(item.data);
            var date = new Date(item.createdAt.getTime() + tzOffset).toISOString();
            var insert = {
                date: {
                    year: parseInt(date.slice(0, 4)),
                    month: parseInt(date.slice(5, 7)),
                    date: parseInt(date.slice(8, 10)),
                    hour: parseInt(date.slice(11, 13)),
                    minute: parseInt(date.slice(14, 16)),
                    second: parseInt(date.slice(17, 19))
                }
            };
            req.body.registers.filter(reg => reg != '_id').forEach(function(reg) {
                insert[reg] = parsed[reg] || null;
            });
            out.push(insert)
        })
        return responder.success(res, {
            list: out
        });
    }).catch(function(err) {
        return responder.handleInternalError(res, err, next);
    });
    // mongoose.models.Log.aggregate([
    //     {
    //         $match: where
    //     },
    //     {
    //         $project: {
    //             _id: 0,
    //             data: 1,
    //             time: {
    //                 $add: ['$createdAt', tzOffset]
    //             }
    //         }
    //     },
    //     {
    //         $group: $group
    //     },
    //     {
    //         $project: $project
    //     },
    //     {
    //         $sort: {
    //             calculatedDate: 1
    //         }
    //     }
    // ]).exec(function (err, items) {

    //     if(err) {
    //         return responder.handleInternalError(res, err, next);
    //     } else if(items.length > 0) {
    //         return responder.success(res, {
    //             list: items
    //         });
    //     } else {
    //         return responder.success(res, {
    //             list: []
    //         });
    //     }
    // });
}