const config = require('./index');
const express = require('express');
const app = express();
const server = require('http').Server(app);
server.listen(process.env.PORT || config.app.port);

module.exports.app = app;
module.exports.server = server;