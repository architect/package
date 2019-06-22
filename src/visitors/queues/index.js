let getEnv = require('../get-lambda-env')
let toLogicalID = require('@architect/utils/to-logical-id')
let getPropertyHelper = require('../get-lambda-config')

/**
 * visit arc.queues and merge in AWS::Serverless resources
 */
module.exports = function visitQueues(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  let appname = toLogicalID(arc.app[0])

  arc.queues.forEach(event=> {

    // create the lambda
    let name = toLogicalID(event)
    let code = `./src/queues/${event}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let env = getEnv(arc)

    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: 'index.handler',
        CodeUri: code,
        Runtime: prop('runtime'),
        MemorySize: prop('memory'),
        Timeout: prop('timeout'),
        Environment: {Variables: env},
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            {roleName: {'Ref': `Role`}}
          ]
        },
        Events: {}
      }
    }

    let concurrency = prop('concurrency')
    if (concurrency != 'unthrottled') {
      template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
    }

    let layers = prop('layers')
    if (Array.isArray(layers) && layers.length > 0) {
      template.Resources[name].Properties.Layers = layers
    }

    // construct the event source so SAM can wire the permissions
    let eventName = `${name}QueueEvent`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'SQS',
      Properties: {
        Queue: {'Fn::GetAtt': [`${name}Queue`, 'Arn']}
      }
    }

    // create the sqs queue
    template.Resources[`${name}Queue`] = {
      Type: 'AWS::SQS::Queue',
      Properties: {}
    }

    template.Outputs[`${name}SqsQueue`] = {
      Description: 'An SQS Queue',
      Value: {Ref: `${name}Queue`},
      Export: {
        Name: {
          'Fn::Join': [":", [appname, {Ref:'AWS::StackName'}, `${name}Queue`]]
        }
      }
    }
  })

  return template
}
