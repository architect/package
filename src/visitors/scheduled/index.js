let toLogicalID = require('@architect/utils/to-logical-id')
let getPropertyHelper = require('../get-lambda-config')
let getEnv = require('../get-lambda-env')

/**
 * visit arc.scheduled and merge in AWS::Serverless resources
 */
module.exports = function visitScheduled(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  //let appname = toLogicalID(arc.app[0])

  // we leave the bucket name generation up to cloudfront
  arc.scheduled.forEach(vector=> {

    let name = toLogicalID(vector.shift())
    let rule = vector.join(' ').trim()
    let code = `./src/scheduled/${name}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let env = getEnv(arc)

    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: 'index.handler',
        CodeUri: code,
        Runtime: prop('runtime'),
        MemorySize: prop('memory'),
        Timeout: prop('timeout'),
        Environment: {Variables: env},
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            {roleName: {'Ref': `Role`}}
          ]
        },
        Events: {}
      }
    }

    let concurrency = prop('concurrency')
    if (concurrency != 'unthrottled') {
      template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
    }

    let layers = prop('layers')
    if (Array.isArray(layers) && layers.length > 0) {
      template.Resources[name].Properties.Layers = layers
    }

    // construct the event source so SAM can wire the permissions
    template.Resources[name].Properties.Events[`${name}Event`] = {
      Type: 'Schedule',
      Properties: {
        Schedule: rule
      }
    }
  })

  return template
}
