let getEnv = require('../get-lambda-env')
let { toLogicalID } = require('@architect/utils')
let getPropertyHelper = require('../get-lambda-config')

/**
 * visit arc.queues and merge in AWS::Serverless resources
 */
module.exports = function visitQueues (arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  arc.queues.forEach(event => {

    // create the lambda
    let name = toLogicalID(event)
    let code = `./src/queues/${event}`
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
        Environment: { Variables: env },
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            { roleName: { 'Ref': `Role` } }
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
    let eventName = `${name}QueueEvent`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'SQS',
      Properties: {
        Queue: { 'Fn::GetAtt': [ `${name}Queue`, 'Arn' ] }
      }
    }

    // create the sqs queue
    template.Resources[`${name}Queue`] = {
      Type: 'AWS::SQS::Queue',
      Properties: {
        VisibilityTimeout: prop('timeout')
      }
    }
    // only add fifo when true; false will cause cfn to fail =/
    let fifo = prop('fifo')
    if (fifo) {
      template.Resources[`${name}Queue`].Properties.FifoQueue = fifo
      template.Resources[`${name}Queue`].Properties.ContentBasedDeduplication = true
    }

    template.Outputs[`${name}SqsQueue`] = {
      Description: 'An SQS Queue',
      Value: { Ref: `${name}Queue` },
    }
  })

  return template
}
