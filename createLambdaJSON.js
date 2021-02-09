let { basename } = require('path')
let { createLambda } = require('./src/visitors/utils')
let read = require('@architect/inventory/src/read')
let defaultFunctionConfig = require('@architect/inventory/src/defaults/function-config')
let { toLogicalID } = require('@architect/utils')

module.exports = function createLambdaJSON (inventory, src) {
  let name = toLogicalID(basename(src))
  let functionConfig = getFunctionConfig(src)
  let functionDefinition = createLambda({
    inventory,
    lambda: {
      src: src,
      config: functionConfig
    }
  })
  return [ `${name}PluginLambda`, functionDefinition ]
}

// compile any per-function config.arc customizations
function getFunctionConfig (src) {
  let defaults = defaultFunctionConfig()
  let customizations = read({ type: 'functionConfig', cwd: src }).arc.aws
  let overrides = {}
  for (let config of customizations) {
    overrides[config[0]] = config[1]
  }
  return { ...defaults, ...overrides }
}
