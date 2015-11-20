fs   = require("fs");
util = require('util');

var logFile = "./line-trace.log"

console.log('line tracer: opening log file')
var logFileFd = fs.openSync(logFile, 'w')

module.exports = function(fname,lnum) {
  fs.write(logFileFd, util.format('trace: %s:%d\n', fname, lnum));
}
