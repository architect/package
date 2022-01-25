let deno = require('./deno')
let events = require('./events')
let globals = require('./globals')
let http = require('./http')
let indexes = require('./tables-indexes')
let queues = require('./queues')
let scheduled = require('./scheduled')
let _static = require('./static')
let tables = require('./tables')
let tablesIndexes = require('./tables-indexes')
let tablesStreams = require('./tables-streams')
let ws = require('./ws')
let customLambdas = require('./custom-lambdas')


module.exports = {
  deno,
  events,
  globals,
  http,
  indexes,
  queues,
  scheduled,
  static: _static,
  tables,
  'tables-indexes': tablesIndexes,
  'tables-streams': tablesStreams,
  ws,
  customLambdas,
}
