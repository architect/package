let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.scheduled and merge in AWS::Serverless resources
 */
module.exports = function visitScheduled (inventory, template) {
  let { inv } = inventory
  if (!inv.scheduled) return template

  // we leave the bucket name generation up to cloudfront
  inv.scheduled.forEach(schedule => {
    let { rate, cron } = schedule
    let rule = rate || cron
    rule = `${rate ? 'rate' : 'cron'}(${rule.expression})`

    let name = toLogicalID(schedule.name)
    let scheduleLambda = `${name}ScheduledLambda`
    let scheduleEvent = `${name}ScheduledEvent`

    // Create the Lambda
    template.Resources[scheduleLambda] = createLambda({
      lambda: schedule,
      inventory,
    })

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
