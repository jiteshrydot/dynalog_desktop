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

module.exports = {
    get: get
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