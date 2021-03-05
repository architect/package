let { sep } = require('path')
let { createLambda } = require('./src/visitors/utils')
let read = require('@architect/inventory/src/read')
let defaultFunctionConfig = require('@architect/inventory/src/defaults/function-config')
let { toLogicalID } = require('@architect/utils')

module.exports = function createLambdaJSON ({ inventory, src }) {
  // clean up the path only for logical ID assembly
  // make sure it doesnt end with a slash
  let pathToCode = src.endsWith(sep) ? src.substr(0, src.length - 1) : src
  pathToCode = pathToCode.
    replace(process.cwd(), ''). // make it relative if it's absolute
    replace(/^\.?\/?\\?/, ''). // axe if it starts with a dot or dot-slash
    replace(/^src\/?\\?/, '') // remove the leading `src/`

  // infer lambda based on source path
  let name = toLogicalID(pathToCode)
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
  let customizations = []
  let existingConfig = read({ type: 'functionConfig', cwd: src })
  if (existingConfig.arc) customizations = existingConfig.arc.aws || []
  let overrides = {}
  for (let config of customizations) {
    overrides[config[0]] = config[1]
  }
  return { ...defaults, ...overrides }
}
