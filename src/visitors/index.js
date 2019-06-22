let events = require('./events')
let globals = require('./globals')
let http = require('./http')
let indexes = require('./indexes')
let queues = require('./queues')
let scheduled = require('./scheduled')
let statics = require('./static')
let tables = require('./tables')
let ws = require('./ws')

module.exports = {
  events,
  globals,
  http,
  indexes,
  queues,
  scheduled,
  static: statics,
  tables,
  ws,
}
