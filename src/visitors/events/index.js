let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.events and merge in AWS::Serverless resources
 */
module.exports = function visitEvents (inventory, template) {
  let { inv } = inventory
  if (!inv.events) return template

  inv.events.forEach(event => {
    let name = toLogicalID(event.name)
    let eventLambda = `${name}EventLambda`
    let eventEvent = `${name}Event`
    let eventTopic = `${name}EventTopic`

    // Create the Lambda
    template.Resources[eventLambda] = createLambda({
      lambda: event,
      inventory,
      template,
    })

    // Construct the event source so SAM can wire the permissions
    template.Resources[eventLambda].Properties.Events[eventEvent] = {
      Type: 'SNS',
      Properties: {
        Topic: { Ref: eventTopic }
      }
    }

    // Create the SNS topic
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
