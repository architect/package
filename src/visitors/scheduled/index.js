let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc.scheduled and merge in AWS::Serverless resources
 */
module.exports = function visitScheduled (inventory, template) {
  let { inv } = inventory
  if (!inv.scheduled) return template

  // Create a single shared IAM role for EventBridge Scheduler to invoke all scheduled Lambdas
  template.Resources.SchedulerRole = {
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
      Policies: [],
    },
  }

  inv.scheduled.forEach(schedule => {
    let { rate, cron, timezone } = schedule
    let rule = rate || cron
    rule = `${rate ? 'rate' : 'cron'}(${rule.expression})`

    let name = toLogicalID(schedule.name)
    let scheduleLambda = `${name}ScheduledLambda`
    let scheduleEvent = `${name}ScheduledEvent`

    // Create the Lambda
    template.Resources[scheduleLambda] = createLambda({
      lambda: schedule,
      inventory,
      template,
    })

    // Add policy to the shared scheduler role to invoke this Lambda
    template.Resources.SchedulerRole.Properties.Policies.push({
      PolicyName: `${name}InvokeLambdaPolicy`,
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [ {
          Effect: 'Allow',
          Action: 'lambda:InvokeFunction',
          Resource: { 'Fn::GetAtt': [ scheduleLambda, 'Arn' ] },
        } ],
      },
    })

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
          RoleArn: { 'Fn::GetAtt': [ 'SchedulerRole', 'Arn' ] },
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
