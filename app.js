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
var express = require('express'),
    config = require('./config/config'),
    glob = require('glob'),
    mongoose = require('mongoose'),
    http = require('http'),
    request = require('request'),
    cluster = require('cluster'),
    numCPUs = require('os').cpus().length;

mongoose.Promise = global.Promise;

initApp()
connectMongo();

mongoose.connection.on('disconnected', connectMongo);

function connectMongo() {
    mongoose.connect(config.database, {
        useCreateIndex: true,
        useNewUrlParser: true
    });
}

function initApp() {

    // var models = glob.sync(config.root + '/app/models/*.js');
    // models.forEach(function (model) {
    //     require(model);
    // });

    var app = express();

    var models = glob.sync(config.root + '/app/models/*.js');
    models.forEach(function (model, i) {
        require(model);
    });

    require('./config/express')(app, config);

    if (cluster.isMaster && process.env.NODE_ENV == 'production') {
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', function (worker) {
            console.log('worker ' + worker.process.pid + ' died');
        });
    } else {
        app.listen(config.port, config.host, function () {
            console.log('Express server listening on http://' + config.host + ':' + config.port);
        });
    }
}
