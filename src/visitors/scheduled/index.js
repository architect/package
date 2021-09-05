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
    let schedulePermission = `${name}ScheduledPermission`

    // Create the Lambda
    template.Resources[scheduleLambda] = createLambda({
      lambda: schedule,
      inventory,
      template,
    })

    // Create the scheduled event rule
    template.Resources[scheduleEvent] = {
      Type: 'AWS::Events::Rule',
      Properties: {
        ScheduleExpression: rule,
        Targets: [
          {
            Arn: { 'Fn::GetAtt': [ scheduleLambda, 'Arn' ] },
            Id: scheduleLambda
          }
        ]
      }
    }

    // Wire the permission
    template.Resources[schedulePermission] = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: { Ref: scheduleLambda },
        Principal: 'events.amazonaws.com',
        SourceArn: { 'Fn::GetAtt': [ scheduleEvent, 'Arn' ] }
      }
    }
  })

  return template
}
