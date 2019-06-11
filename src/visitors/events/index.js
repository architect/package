let getEnv = require('../get-lambda-env')
let toLogicalID = require('@architect/utils/to-logical-id')
let getPropertyHelper = require('../get-lambda-config')
let getPolicies = require('../get-lambda-policies')

/**
 * visit arc.events and merge in AWS::Serverless resources
 */
module.exports = function statics(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  arc.events.forEach(event=> {

    // create the lambda
    let name = toLogicalID(event)
    let code = `./src/events/${event}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let policies = getPolicies(arc, code)
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
        Policies: policies,
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
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'SNS',
      Properties: {
        Topic: {'Ref': `${name}Topic`}
      }
    }

    // create the lambda permission

    /* create the sns topic */
    template.Resources[`${name}Topic`] = {
      Type: 'AWS::SNS::Topic',
      Properties: {
        DisplayName: name,
        Subscription: [/*{
          Endpoint: {
            'Fn::GetAtt': [name, 'Arn']
          },
          Protocol: 'lambda'
        }*/]
      }
    }
  })

  // which means we need to share it here
  /*
  template.Outputs.BucketURL = {
    Description: 'Bucket URL',
    Value: {
      'Fn::Sub': [
        'http://${bukkit}.s3.${AWS::Region}.amazonaws.com',
        {bukkit: {'Ref': 'StaticBucket'}}
      ]
    }
  }*/

  return template
}
