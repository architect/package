let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.queues and merge in AWS::Serverless resources
 */
module.exports = function visitQueues (inventory, template) {
  let { inv } = inventory
  if (!inv.queues) return template

  inv.queues.forEach(queue => {
    let { config, batchSize, batchWindow, fifo } = queue

    // for backwards compat; if fifo isn't on the queue itself it could be within the config
    if (!fifo) fifo = config.fifo

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
        Queue: { 'Fn::GetAtt': [ queueQueue, 'Arn' ] },
      },
    }

    // Create the sqs queue
    template.Resources[queueQueue] = {
      Type: 'AWS::SQS::Queue',
      Properties: {
        VisibilityTimeout: config.timeout,
      },
    }

    // Only add fifo when true; false will cause cfn to fail =/
    if (fifo) {
      template.Resources[queueQueue].Properties.FifoQueue = fifo
      template.Resources[queueQueue].Properties.ContentBasedDeduplication = true

      template.Resources[queueLambda].Properties.ReservedConcurrentExecutions = batchSize || 1
      template.Resources[queueLambda].Properties.Events[queueEvent].Properties.BatchSize = 1
      template.Resources[queueLambda].Properties.Events[queueEvent].Properties.MaximumBatchingWindowInSeconds = 0

      if (batchWindow) {
        // When batchWindow is defined we adjust all the timeouts
        template.Resources[queueQueue].Properties.VisibilityTimeout = batchWindow * 6
        template.Resources[queueLambda].Properties.Timeout = batchWindow
      }
    }

    template.Outputs[`${name}SqsQueue`] = {
      Description: 'An SQS Queue',
      Value: { Ref: queueQueue },
    }
  })

  return template
}
