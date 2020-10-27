let { getLambdaEnv } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.events and merge in AWS::Serverless resources
 */
module.exports = function visitEvents (inventory, template) {
  let { inv } = inventory
  if (!inv.events) return template

  inv.events.forEach(event => {
    let { src, config } = event
    let { timeout, memory, runtime, handler, concurrency, layers, policies } = config

    // Create the Lambda
    let name = toLogicalID(event.name)
    let eventLambda = `${name}EventLambda`
    let eventEvent = `${name}Event`
    let eventTopic = `${name}EventTopic`

    let env = getLambdaEnv(runtime, inventory)

    template.Resources[eventLambda] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: handler,
        CodeUri: src,
        Runtime: runtime,
        MemorySize: memory,
        Timeout: timeout,
        Environment: { Variables: env },
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            { roleName: { Ref: 'Role' } }
          ]
        },
        Events: {}
      }
    }

    if (concurrency !== 'unthrottled') {
      template.Resources[eventLambda].Properties.ReservedConcurrentExecutions = concurrency
    }

    if (layers.length > 0) {
      template.Resources[eventLambda].Properties.Layers = layers
    }

    if (policies.length > 0) {
      template.Resources[eventLambda].Properties.Policies = policies
    }

    // Construct the event source so SAM can wire the permissions
    template.Resources[eventLambda].Properties.Events[eventEvent] = {
      Type: 'SNS',
      Properties: {
        Topic: { Ref: eventTopic }
      }
    }

    // Create the sns topic
    template.Resources[eventTopic] = {
      Type: 'AWS::SNS::Topic',
      Properties: {
        DisplayName: name,
        Subscription: []
      }
    }

    template.Outputs[eventTopic] = {
      Description: 'An SNS Topic',
      Value: { Ref: eventTopic },
    }
  })

  return template
}
