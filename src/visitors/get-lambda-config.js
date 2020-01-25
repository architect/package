let parse = require('@architect/parser')
let fs = require('fs')
let path = require('path')

/**
 * @param {Object} a - {}
 * @param {Array} b - ['runtime', 'nodejs12.x']
 * @returns {Object} - {runtime: 'nodejs12.x}
 */
function invert(a, b) {
  let isLayerOrPolicyArray = Array.isArray(b) && (b[0] === 'layers' || b[0] === 'policies')
  let isLayerOrPolicyObject = typeof b === 'object' && (Object.keys(b)[0] === 'layers' || Object.keys(b)[0] === 'policies')
  if (isLayerOrPolicyArray) {
    let nom = b.shift()
    if (!a[nom])
      a[nom] = b
    else
      a[nom] = a[nom].concat(b)
    return a
  }
  if (isLayerOrPolicyObject) {
    let nom = Object.keys(b)[0]
    if (!a[nom])
      a[nom] = Object.keys(b[nom])
    else
      a[nom] = a[nom].concat(Object.keys(b[nom]))
    return a
  }
  a[b[0]] = b[1]
  return a
}

module.exports = function getPropertyHelper(arc, pathToCode) {

  // default props
  let props = {
    timeout: 5,
    memory: 1152,
    runtime: 'nodejs12.x',
    state: 'n/a',
    concurrency: 'unthrottled',
    fifo: true,
    layers: [],
    policies: [],
  }

  // .arc global override
  if (arc.aws) {
    let globals = arc.aws.reduce(invert, {})
    props = Object.assign({}, props, globals)
  }

  // .arc-config local override
  let arcFile = path.join(pathToCode, '.arc-config')
  let exists = fs.existsSync(arcFile)
  if (exists) {
    let raw = fs.readFileSync(arcFile).toString().trim()
    let config = parse(raw)
    if (config.aws) {
      config = config.aws.reduce(invert, {})
    }
    props = Object.assign({}, props, config)
  }

  return function getProp(name) {
    return props[name]
  }
}
