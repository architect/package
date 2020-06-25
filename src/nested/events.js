let { toLogicalID } = require('@architect/utils')
let { version } = require('../../package.json')
let getEnv = require('../visitors/get-lambda-env')
let getPropertyHelper = require('../visitors/get-lambda-config')

module.exports = function nestEvents (arc) {

  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${new Date(Date.now()).toISOString()}`,
    Parameters: {
      Role: {
        Description: 'IAM Role ARN',
        Type: 'String'
      }
    },
    Resources: {},
    Outputs: {}
  }

  if (arc.static) {
    template.Parameters.StaticBucket = {
      Type: 'String',
      Description: 'Static Bucket ARN'
    }
  }

  arc.events.forEach(event => {

    // create the lambda
    let name = toLogicalID(event)
    let code = `./src/events/${event}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let env = getEnv(arc, code)

    template.Parameters[`${name}Topic`] = {
      Type: 'String',
      Description: 'SNS Topic ARN'
    }

    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: 'index.handler',
        CodeUri: code,
        Runtime: prop('runtime'),
        MemorySize: prop('memory'),
        Timeout: prop('timeout'),
        Environment: { Variables: env },
        Role: { Ref: 'Role' },
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
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'SNS',
      Properties: {
        Topic: { 'Ref': `${name}Topic` }
      }
    }
  })

  return template
}
