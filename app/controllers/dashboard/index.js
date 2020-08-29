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
    _ = require('lodash'),
    request = require('request'),
    translation = require('../../libs/translation'),
    ipAddress = require('../../libs/ipAddress'),
    responder = require('../../libs/responder'),
    validationErrors = require('../../libs/validationErrors'),
    config = require('../../../config/config');
const { toString } = require('lodash');

module.exports = {
    get: get,
    timeline: timeline
};

async function get(req, res, next) {

    var where = {
        isDeleted: false
    };
    mongoose.models.Log.findOne(where).sort({
        createdAt: -1
    }).exec(function (err, item) {

        if(err) {
            return handleInternalError(res, err, next);
        } else if(item) {
            return responder.success(res, {
                item: item.data
            });
        } else {
            return responder.success(res, {
                item: {}
            });
        }
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
        createdAt: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate)
        }
    };
    var $group = {
        _id: {
            date: {
                $dayOfMonth: '$time'
            },
            month: {
                $month: '$time'
            },
            year: {
                $year: '$time'
            },
            hour: {
                $hour: '$time'
            },
            minute: {
                $minute: '$time'
            }
        }
    }
    var $project = {
        _id: 0,
        date: '$_id',
        calculatedDate: {
            $sum: [
                {
                    $multiply: ['$_id.year', 100000000]
                },
                {
                    $multiply: ['$_id.month', 1000000]
                },
                {
                    $multiply: ['$_id.date', 10000]
                },
                {
                    $multiply: ['$_id.hour', 100]
                },
                '$_id.minute'
            ]
        }
    };
    req.body.registers.filter(reg => reg != '_id').forEach(function(reg) {
        $group[reg] = {
            $avg: `$data.${reg}`
        };
        $project[reg] = 1;
    });
    mongoose.models.Log.aggregate([
        {
            $match: where
        },
        {
            $project: {
                _id: 0,
                data: 1,
                time: {
                    $add: ['$createdAt', tzOffset]
                }
            }
        },
        {
            $group: $group
        },
        {
            $project: $project
        },
        {
            $sort: {
                calculatedDate: 1
            }
        }
    ]).exec(function (err, items) {

        if(err) {
            return responder.handleInternalError(res, err, next);
        } else if(items.length > 0) {
            return responder.success(res, {
                list: items
            });
        } else {
            return responder.success(res, {
                list: []
            });
        }
    });
}