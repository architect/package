let parse = require('@architect/parser')
let fs = require('fs')
let path = require('path')

function updateProps (props, config) {
  for (let setting of config) {
    let name
    let value
    let isArrayProp

    /**
     * Example
     * ---
     * policies foobar
     * ---
     * produces arc.aws: [[ 'policies', 'foobar' ]]
     */
    if (Array.isArray(setting)) {
      // Normalize singular to AWS equivalents
      if (setting[0] === 'policy') setting[0] = 'policies'
      if (setting[0] === 'layer') setting[0] = 'layers'
      name = setting[0]
      value = setting[1]
      isArrayProp = name === 'policies' || name === 'layers'
    }

    /**
     * Example:
     * ---
     * policies
     *   foobar
     * ---
     * produces arc.aws: [{ policies: [ 'foobar' ] }]
     */
    else if (typeof setting === 'object') {
      // Normalize singular to AWS equivalents
      if (setting.policy) {
        setting.policies = setting.policy
        delete setting.policy
      }
      if (setting.layer) {
        setting.layers = setting.layer
        delete setting.layer
      }
      name = Object.keys(setting)[0]
      value = setting[name]
      isArrayProp = name === 'policies' || name === 'layers'
    }
    else continue // Technically invalid and should have been caught by parser

    // Populate default props with config
    if (props[name] && isArrayProp) {
      // Value may be a single item or an array
      if (!Array.isArray(value)) value = [ value ]
      props[name] = props[name].concat(value).filter(p => p)
    }
    else if (props[name] && typeof value !== 'undefined') {
      props[name] = value
    }
  }

  return props
}



module.exports = function getPropertyHelper(arc, pathToCode) {

  // Default props
  let props = {
    timeout: 5,
    memory: 1152,
    runtime: 'nodejs12.x',
    state: 'n/a',
    concurrency: 'unthrottled',
    fifo: true, // Applies only to queues
    layers: [],
    policies: [],
  }

  // Global settings
  if (arc.aws) {
    props = updateProps(props, arc.aws)
  }

  // .arc-config local override
  let arcFile = path.join(pathToCode, '.arc-config')
  let exists = fs.existsSync(arcFile)
  if (exists) {
    let raw = fs.readFileSync(arcFile).toString().trim()
    let config = parse(raw)
    if (config.aws) {
      props = updateProps(props, config.aws)
    }
  }

  // Layer validation
  if (props.layers.length > 5) throw Error('Lambda can only be configured with up to 5 layers')
  // CloudFormation fails without a helpful error if any layers aren't in the same region as the app because CloudFormation
  if (props.layers.length) {
    for (let layer of props.layers) {
      let layerRegion = layer.split(':')[3]
      let getRegion = s => s[0] === 'region' && s[1]
      let arcRegion = arc.aws && arc.aws.some(getRegion) && arc.aws.find(getRegion)[1]
      let region = process.env.AWS_REGION || arcRegion
      if (region && region !== layerRegion) {
        let msg = `Lambda layers must be in the same region as app\nApp region: ${region}\nLayer ARN: ${layer}`
        throw Error(msg)
      }
    }
  }

  return function getProp(name) {
    return props[name]
  }
}
