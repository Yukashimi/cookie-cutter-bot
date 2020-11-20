#!/usr/bin/env

'use strict';

require('dotenv').config({ silent: true });
const colored_console = require("./console-helper.js");
const config = require("./config.js");

var server = require('./app');
var port = config.CURRENT_PORT || config.DEFAULT_PORT;

server.listen(port, () => {
  // example of how to call the coloret console functions
  colored_console.log.green("Hi, Monika here.");
  colored_console.log.green(`Okay, everyone! The club is at the port ${port}`);
});
