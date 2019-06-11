let http = require('./http')
let statics = require('./static')
let tables = require('./tables')
let indexes = require('./indexes')
let events = require('./events')

module.exports = {
  http,
  static: statics,
  tables,
  indexes,
  events,
}
