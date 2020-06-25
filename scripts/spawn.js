let child = require('child_process')
let print = require('./print')

// spawn helper
module.exports = function spawn (command, args, { log, verbose }, callback) {
  let pretty = print({ log, verbose })
  let pkg = child.spawn(command, args, { shell: true })
  pretty.spawn(command, args)
  pkg.stdout.on('data', pretty.stdout)
  pkg.stderr.on('data', pretty.stderr)
  pkg.on('close', () => callback())
  pkg.on('error', callback)
}
