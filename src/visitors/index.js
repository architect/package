let deno = require('./deno')
let events = require('./events')
let globals = require('./globals')
let http = require('./http')
let indexes = require('./indexes')
let php = require('./php')
let queues = require('./queues')
let scheduled = require('./scheduled')
let statics = require('./static')
let tables = require('./tables')
let ws = require('./ws')

module.exports = {
  deno,
  events,
  globals,
  http,
  indexes,
  php,
  queues,
  scheduled,
  static: statics,
  tables,
  ws,
}
