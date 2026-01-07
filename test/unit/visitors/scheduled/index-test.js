const { test } = require('node:test')
const assert = require('node:assert')
let inventory = require('../../../../../inventory')
let pkg = require('../../../../')

let base = `@app
myapp
`
let deployStage = 'staging'
let arc = config => `${base}\n${config ? config : ''}`

test('Scheduled visitor should return untouched template if inventory contains no scheduled functions', async () => {
  let rawArc = arc()
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)
  let scheduledResources = Object.keys(cfn.Resources).filter(k => k.includes('Scheduled'))
  assert.strictEqual(scheduledResources.length, 0, 'no scheduled resources created without @scheduled pragma')
})

test('Scheduled visitor creates AWS::Scheduler::Schedule resource for rate expression', async () => {
  let rawArc = arc(`@scheduled
daily-task rate(1 day)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  // Check the schedule resource exists and has correct type
  assert.ok(cfn.Resources.DailyTaskScheduledEvent, 'schedule event resource exists')
  assert.strictEqual(cfn.Resources.DailyTaskScheduledEvent.Type, 'AWS::Scheduler::Schedule', 'uses AWS::Scheduler::Schedule type')
})

test('Scheduled visitor creates AWS::Scheduler::Schedule resource for cron expression', async () => {
  let rawArc = arc(`@scheduled
hourly-job cron(0 * * * ? *)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  assert.ok(cfn.Resources.HourlyJobScheduledEvent, 'schedule event resource exists')
  assert.strictEqual(cfn.Resources.HourlyJobScheduledEvent.Type, 'AWS::Scheduler::Schedule', 'uses AWS::Scheduler::Schedule type')
  assert.ok(cfn.Resources.HourlyJobScheduledEvent.Properties.ScheduleExpression.startsWith('cron('), 'schedule expression is a cron expression')
})

test('Scheduled visitor creates Lambda function resource', async () => {
  let rawArc = arc(`@scheduled
my-task rate(5 minutes)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  assert.ok(cfn.Resources.MyTaskScheduledLambda, 'Lambda resource exists')
  assert.strictEqual(cfn.Resources.MyTaskScheduledLambda.Type, 'AWS::Serverless::Function', 'Lambda has correct type')
})

test('Scheduled visitor creates IAM role for EventBridge Scheduler', async () => {
  let rawArc = arc(`@scheduled
my-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  // Check the scheduler role exists
  assert.ok(cfn.Resources.MyTaskScheduledRole, 'scheduler role resource exists')
  assert.strictEqual(cfn.Resources.MyTaskScheduledRole.Type, 'AWS::IAM::Role', 'scheduler role has correct type')

  // Check the assume role policy allows scheduler.amazonaws.com
  let assumeRolePolicy = cfn.Resources.MyTaskScheduledRole.Properties.AssumeRolePolicyDocument
  assert.ok(assumeRolePolicy, 'assume role policy exists')
  let statement = assumeRolePolicy.Statement[0]
  assert.strictEqual(statement.Principal.Service, 'scheduler.amazonaws.com', 'scheduler service is allowed to assume role')

  // Check the policy allows lambda:InvokeFunction
  let policies = cfn.Resources.MyTaskScheduledRole.Properties.Policies
  assert.ok(policies.length > 0, 'policies exist')
  let invokeStatement = policies[0].PolicyDocument.Statement[0]
  assert.strictEqual(invokeStatement.Action, 'lambda:InvokeFunction', 'policy allows lambda:InvokeFunction')
})

test('Scheduled visitor sets FlexibleTimeWindow to OFF', async () => {
  let rawArc = arc(`@scheduled
my-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  let flexWindow = cfn.Resources.MyTaskScheduledEvent.Properties.FlexibleTimeWindow
  assert.ok(flexWindow, 'FlexibleTimeWindow exists')
  assert.strictEqual(flexWindow.Mode, 'OFF', 'FlexibleTimeWindow mode is OFF')
})

test('Scheduled visitor configures Target with Lambda Arn and RoleArn', async () => {
  let rawArc = arc(`@scheduled
my-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  let target = cfn.Resources.MyTaskScheduledEvent.Properties.Target
  assert.ok(target, 'Target exists')
  assert.ok(target.Arn, 'Target has Arn')
  assert.ok(target.RoleArn, 'Target has RoleArn')

  // Verify the Arn references the Lambda
  assert.deepStrictEqual(target.Arn, { 'Fn::GetAtt': [ 'MyTaskScheduledLambda', 'Arn' ] }, 'Target Arn references Lambda')

  // Verify the RoleArn references the scheduler role
  assert.deepStrictEqual(target.RoleArn, { 'Fn::GetAtt': [ 'MyTaskScheduledRole', 'Arn' ] }, 'Target RoleArn references scheduler role')
})

test('Scheduled visitor adds timezone when specified', async () => {
  let rawArc = arc(`@scheduled
my-task
  rate 1 day
  timezone America/New_York
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  assert.ok(cfn.Resources.MyTaskScheduledEvent.Properties.ScheduleExpressionTimezone, 'timezone property exists')
  assert.strictEqual(cfn.Resources.MyTaskScheduledEvent.Properties.ScheduleExpressionTimezone, 'America/New_York', 'timezone is set correctly')
})

test('Scheduled visitor does not add timezone when not specified', async () => {
  let rawArc = arc(`@scheduled
my-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  assert.strictEqual(cfn.Resources.MyTaskScheduledEvent.Properties.ScheduleExpressionTimezone, undefined, 'timezone property is not set')
})

test('Scheduled visitor creates resources for multiple scheduled functions', async () => {
  let rawArc = arc(`@scheduled
task-one rate(1 hour)
task-two rate(1 day)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  // Check both sets of resources exist
  assert.ok(cfn.Resources.TaskOneScheduledLambda, 'first Lambda exists')
  assert.ok(cfn.Resources.TaskOneScheduledEvent, 'first schedule event exists')
  assert.ok(cfn.Resources.TaskOneScheduledRole, 'first scheduler role exists')

  assert.ok(cfn.Resources.TaskTwoScheduledLambda, 'second Lambda exists')
  assert.ok(cfn.Resources.TaskTwoScheduledEvent, 'second schedule event exists')
  assert.ok(cfn.Resources.TaskTwoScheduledRole, 'second scheduler role exists')
})

test('Scheduled visitor does not create AWS::Lambda::Permission (uses IAM role instead)', async () => {
  let rawArc = arc(`@scheduled
my-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  // Ensure no Lambda permission resource is created (scheduler uses IAM role)
  let permissionResources = Object.keys(cfn.Resources).filter(k => k.includes('ScheduledPermission'))
  assert.strictEqual(permissionResources.length, 0, 'no Lambda permission resources created')
})

test('Scheduled visitor handles hyphenated names correctly', async () => {
  let rawArc = arc(`@scheduled
my-hyphenated-task rate(1 hour)
`)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)

  assert.ok(cfn.Resources.MyHyphenatedTaskScheduledLambda, 'Lambda with hyphenated name exists')
  assert.ok(cfn.Resources.MyHyphenatedTaskScheduledEvent, 'schedule event with hyphenated name exists')
  assert.ok(cfn.Resources.MyHyphenatedTaskScheduledRole, 'scheduler role with hyphenated name exists')
})

