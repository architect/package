let { test } = require('node:test')
let { ok } = require('node:assert')

let inventory = require('@architect/inventory')
let package = require('../../')

test('Module is present', () => {
  ok(package, 'Package module is present')
})

test('Can output plausible CloudFormation', async () => {

  let inv = await inventory({
    deployStage: 'staging',
    rawArc: `
      @app
      myapp

      @queues
      test-q`,
  })

  let sam = package(inv)

  // Queue expected defaults
  let timeout = sam.Resources.TestQQueueLambda.Properties.Timeout
  ok(sam.Resources.TestQQueue.Properties.VisibilityTimeout === timeout)
  ok(sam.Resources.TestQQueue.Properties.FifoQueue)
  ok(sam.Resources.TestQQueue.Properties.ContentBasedDeduplication)

  // Queue Lambda expected defaults
  ok(sam.Resources.TestQQueueLambda.Properties.ReservedConcurrentExecutions === 1)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.BatchSize === 1)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.MaximumBatchingWindowInSeconds === 0)
})

test('batchSize respected', async () => {

  let inv = await inventory({
    deployStage: 'staging',
    rawArc: `
@app
myapp
@queues
test-q
  batchSize 5`
  })

  let sam = package(inv)

  // Queue expected defaults
  let timeout = sam.Resources.TestQQueueLambda.Properties.Timeout
  ok(sam.Resources.TestQQueue.Properties.VisibilityTimeout === timeout)
  ok(sam.Resources.TestQQueue.Properties.FifoQueue)
  ok(sam.Resources.TestQQueue.Properties.ContentBasedDeduplication)

  // Queue Lambda expected defaults
  ok(sam.Resources.TestQQueueLambda.Properties.ReservedConcurrentExecutions === 5)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.BatchSize === 1)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.MaximumBatchingWindowInSeconds === 0)

})

test('batchWindow respected', async () => {

  let inv = await inventory({
    deployStage: 'staging',
    rawArc: `
@app
myapp
@queues
test-q
  batchSize 5
  batchWindow 30`
  })

  let sam = package(inv)

  let timeout = sam.Resources.TestQQueueLambda.Properties.Timeout
  ok(timeout === 30)

  // Queue expected defaults
  ok(sam.Resources.TestQQueue.Properties.VisibilityTimeout === timeout * 6)
  ok(sam.Resources.TestQQueue.Properties.FifoQueue)
  ok(sam.Resources.TestQQueue.Properties.ContentBasedDeduplication)

  // Queue Lambda expected defaults
  ok(sam.Resources.TestQQueueLambda.Properties.ReservedConcurrentExecutions === 5)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.BatchSize === 1)
  ok(sam.Resources.TestQQueueLambda.Properties.Events.TestQQueueEvent.Properties.MaximumBatchingWindowInSeconds === 0)

})

// test deploy
