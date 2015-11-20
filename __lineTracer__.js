fs   = require("fs");
util = require('util');

var logFile = "./line-trace.log"

var logFileFd = 0;

function openLog() {
  console.log('opening log file')
  logFileFd = fs.openSync(logFile, 'w')
}

openLog();

module.exports = function(fname,lnum) {
  fs.write(logFileFd, util.format('trace: %s:%d\n', fname, lnum));
}

