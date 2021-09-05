let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.queues and merge in AWS::Serverless resources
 */
module.exports = function visitQueues (inventory, template) {
  let { inv } = inventory
  if (!inv.queues) return template

  inv.queues.forEach(queue => {
    let { config } = queue
    let { timeout, fifo } = config

    let name = toLogicalID(queue.name)
    let queueLambda = `${name}QueueLambda`
    let queueEvent = `${name}QueueEvent`
    let queueQueue = `${name}Queue`

    // Create the Lambda
    template.Resources[queueLambda] = createLambda({
      lambda: queue,
      inventory,
      template,
    })

    // Construct the event source so SAM can wire the permissions
    template.Resources[queueLambda].Properties.Events[queueEvent] = {
      Type: 'SQS',
      Properties: {
        Queue: { 'Fn::GetAtt': [ queueQueue, 'Arn' ] }
      }
    }

    // Create the sqs queue
    template.Resources[queueQueue] = {
      Type: 'AWS::SQS::Queue',
      Properties: {
        VisibilityTimeout: timeout
      }
    }

    // Only add fifo when true; false will cause cfn to fail =/
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
