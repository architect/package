let getEnv = require('../get-lambda-env')
let {toLogicalID} = require('@architect/utils')
let getPropertyHelper = require('../get-lambda-config')

/**
 * visit arc.events and merge in AWS::Serverless resources
 */
module.exports = function statics(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  // let appname = toLogicalID(arc.app[0])

  arc.events.forEach(event=> {

    // create the lambda
    let name = toLogicalID(event)
    let code = `./src/events/${event}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let env = getEnv(arc, code)

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

    let policies = prop('policies')
    if (Array.isArray(policies) && policies.length > 0) {
      template.Resources[name].Properties.Policies = policies
    }

    // construct the event source so SAM can wire the permissions
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'SNS',
      Properties: {
        Topic: {'Ref': `${name}Topic`}
      }
    }

    // create the sns topic
    template.Resources[`${name}Topic`] = {
      Type: 'AWS::SNS::Topic',
      Properties: {
        DisplayName: name,
        Subscription: []
      }
    }

    template.Outputs[`${name}SnsTopic`] = {
      Description: 'An SNS Topic',
      Value: {Ref: `${name}Topic`},
      /*
      Export: {
        Name: {
          'Fn::Join': [":", [appname, {Ref:'AWS::StackName'}, `${name}Topic`]]
        }
      }*/
    }
  })

  return template
}
