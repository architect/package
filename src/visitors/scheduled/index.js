let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.scheduled and merge in AWS::Serverless resources
 */
module.exports = function visitScheduled (inventory, template) {
  let { inv } = inventory
  if (!inv.scheduled) return template

  inv.scheduled.forEach(schedule => {
    let { rate, cron, timezone } = schedule
    let rule = rate || cron
    rule = `${rate ? 'rate' : 'cron'}(${rule.expression})`

    let name = toLogicalID(schedule.name)
    let scheduleLambda = `${name}ScheduledLambda`
    let scheduleEvent = `${name}ScheduledEvent`
    let scheduleRole = `${name}ScheduledRole`

    // Create the Lambda
    template.Resources[scheduleLambda] = createLambda({
      lambda: schedule,
      inventory,
      template,
    })

    // Create IAM role for EventBridge Scheduler to invoke the Lambda
    template.Resources[scheduleRole] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [ {
            Effect: 'Allow',
            Principal: {
              Service: 'scheduler.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          } ],
        },
        Policies: [ {
          PolicyName: 'InvokeLambdaPolicy',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [ {
              Effect: 'Allow',
              Action: 'lambda:InvokeFunction',
              Resource: { 'Fn::GetAtt': [ scheduleLambda, 'Arn' ] },
            } ],
          },
        } ],
      },
    }

    // Create the schedule using AWS::Scheduler::Schedule
    template.Resources[scheduleEvent] = {
      Type: 'AWS::Scheduler::Schedule',
      Properties: {
        ScheduleExpression: rule,
        FlexibleTimeWindow: {
          Mode: 'OFF',
        },
        Target: {
          Arn: { 'Fn::GetAtt': [ scheduleLambda, 'Arn' ] },
          RoleArn: { 'Fn::GetAtt': [ scheduleRole, 'Arn' ] },
        },
      },
    }

    // Add timezone if specified
    if (timezone) {
      template.Resources[scheduleEvent].Properties.ScheduleExpressionTimezone = timezone
    }
  })

  return template
}
