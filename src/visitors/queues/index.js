let { getLambdaEnv } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.queues and merge in AWS::Serverless resources
 */
module.exports = function visitQueues (inventory, template) {
  let { inv } = inventory
  if (!inv.queues) return template

  inv.queues.forEach(queue => {
    let { src, config } = queue
    let { timeout, memory, runtime, handler, concurrency, layers, policies, fifo } = config

    // Create the Lambda
    let name = toLogicalID(queue.name)
    let queueLambda = `${name}QueueLambda`
    let queueEvent = `${name}QueueEvent`
    let queueQueue = `${name}Queue`
    let env = getLambdaEnv(runtime, inventory)

    template.Resources[queueLambda] = {
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
      template.Resources[queueLambda].Properties.ReservedConcurrentExecutions = concurrency
    }

    if (layers.length > 0) {
      template.Resources[queueLambda].Properties.Layers = layers
    }

    if (policies.length > 0) {
      template.Resources[queueLambda].Properties.Policies = policies
    }

    // construct the event source so SAM can wire the permissions
    template.Resources[queueLambda].Properties.Events[queueEvent] = {
      Type: 'SQS',
      Properties: {
        Queue: { 'Fn::GetAtt': [ queueQueue, 'Arn' ] }
      }
    }

    // create the sqs queue
    template.Resources[queueQueue] = {
      Type: 'AWS::SQS::Queue',
      Properties: {
        VisibilityTimeout: timeout
      }
    }
    // only add fifo when true; false will cause cfn to fail =/
    if (fifo) {
      template.Resources[queueQueue].Properties.FifoQueue = fifo
      template.Resources[queueQueue].Properties.ContentBasedDeduplication = true
    }

    template.Outputs[`${name}SqsQueue`] = {
      Description: 'An SQS Queue',
      Value: { Ref: queueQueue },
    }
  })

  return template
}
