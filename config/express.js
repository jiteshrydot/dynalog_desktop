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
var express = require('express');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var routes = require('./routes');
var tokenParser = require('../app/libs/tokenParser');
var translation = require('../app/libs/translation');

module.exports = function (app, config) {
    var env = process.env.NODE_ENV || 'development';
    app.locals.ENV = env;
    app.locals.ENV_DEVELOPMENT = env == 'development';

    app.locals.tokenSecret = config.app.secret;

    app.set('views', config.root + '/app/views');
    app.set('view engine', 'ejs');

    app.use(function (req, res, next) {
        if (!process._events.uncaughtException) {
            process.on('uncaughtException', function (err) {
                next(err);
            });
        }
        next();
    });

    var allowedOrigins = [
        'http://104.251.219.38:9117'
    ];

    if (env != 'production') {
        allowedOrigins.push('*');
    }

    app.use(function (req, res, next) {

        var origin = req.headers.origin;

        if (allowedOrigins.indexOf(origin) > -1) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (allowedOrigins.indexOf('*') > -1) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        // res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, x-access-token, x-time-zone');
        res.setHeader('Access-Control-Allow-Credentials', true);
        if (req.method == 'OPTIONS') {
            return res.status(200).end();
        } else {
            next();
        }
    });

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use('/uploads', function (req, res, next) {
        if (req.method == 'GET') {
            res.on('finish', function (a, b, c) {
                var indexOfExport = req.url.indexOf('export-');
                if (res.statusCode == 200 && indexOfExport > -1 && req.url.length - 4 == req.url.indexOf('.csv')) {
                    try {
                        fs.unlink(path.join(config.root, '/uploads/', req.url.substring(indexOfExport)));
                    } catch (ex) {
                        console.log(ex)
                    }
                }
            });
        }
        next();
    }, express.static(config.root + '/uploads'));
    // app.use(express.static(config.root + '/public'));
    app.use(methodOverride());

    app.use(tokenParser());
    var middlewares = glob.sync(config.root + '/app/middlewares/*.js');
    middlewares.forEach(function (mdl) {
        app.use(require(mdl)());
    });

    for (name in routes) {
        app.use(name, require(config.root + '/app/routes/' + routes[name]));
    }

    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    app.use(function (req, res, next) {
        if (!req.timedout) next();
    });

    app.use(function (err, req, res, next) {
        var status = err.status || 500;

        if (status == 500) {
            console.log(err)
            res.internalError = err;
        }

        if (res.headersSent == false) {

            if (status == 404) {
                return res.status(status).json({
                    success: false,
                    errors: [{
                        param: null,
                        code: 'common.errors.url_not_found',
                        msg: translation.translate(req, 'common.errors.url_not_found')
                    }]
                });
            } else {
                return res.status(status).json({
                    success: false,
                    errors: [{
                        param: null,
                        code: 'common.errors.internal_error',
                        msg: translation.translate(req, 'common.errors.internal_error')
                    }]
                });
            }
        }
    });
};