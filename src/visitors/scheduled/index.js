let { getLambdaEnv } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.scheduled and merge in AWS::Serverless resources
 */
module.exports = function visitScheduled (inventory, template) {
  let { inv } = inventory
  if (!inv.scheduled) return template

  // we leave the bucket name generation up to cloudfront
  inv.scheduled.forEach(schedule => {
    let { src, rate, cron, config } = schedule
    let { timeout, memory, runtime, handler, concurrency, layers, policies } = config

    // Create the Lambda
    let name = toLogicalID(schedule.name)
    let scheduleLambda = `${name}ScheduledLambda`
    let scheduleEvent = `${name}ScheduledEvent`
    // let scheduledQueue = `${name}Schedule`

    let env = getLambdaEnv(runtime, inventory)
    let rule = rate || cron
    rule = `${rate ? 'rate' : 'cron'}(${rule.expression})`

    template.Resources[scheduleLambda] = {
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
      template.Resources[scheduleLambda].Properties.ReservedConcurrentExecutions = concurrency
    }

    if (layers.length > 0) {
      template.Resources[scheduleLambda].Properties.Layers = layers
    }

    if (policies.length > 0) {
      template.Resources[scheduleLambda].Properties.Policies = policies
    }

    // construct the event source so SAM can wire the permissions
    template.Resources[scheduleLambda].Properties.Events[scheduleEvent] = {
      Type: 'Schedule',
      Properties: {
        Schedule: rule
      }
    }
  })

  return template
}
