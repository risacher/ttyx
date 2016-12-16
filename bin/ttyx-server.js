#!/usr/bin/env node

/**
 * ttyx-server.js
 * Copyright (c) 2016, Dan Risacher (MIT License)
 * Copyright (c) 2012-2014, Christopher Jeffrey (MIT License)
 */

process.title = 'ttyx';

var ttyx = require('../');

var conf = ttyx.config.readConfig()

conf.shellArgs = function(session) {
    console.log ('session id', session.id);
//    console.log ('session headers:', session.req.headers);
    var xff = session.req.headers['x-forwarded-for'] || "no xff header";
    return [session.id, xff]; //session.req.headers['x-args'].split(' ');
};


var app = ttyx.Server(conf);

app.listen();
