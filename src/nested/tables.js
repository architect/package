let {toLogicalID} = require('@architect/utils')
let {version} = require('../../package.json')
let visit = require('../visitors/tables')
let getEnv = require('../visitors/get-lambda-env')
let getPropertyHelper = require('../visitors/get-lambda-config')

module.exports = function nestScheduled(arc) {

  let template = visit(arc, {
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
  })

  // remove AWS::DynamoDB::Table refs
  Object.keys(template.Resources).forEach(k=> {
    if (template.Resources[k].Type === 'AWS::DynamoDB::Table') {
      delete template.Resources[k]
    }
  })

  if (arc.static) {
    template.Parameters.StaticBucket = {
      Type: 'String',
      Description: 'Static Bucket ARN'
    }
  }

  arc.tables.forEach(table=> {

    let tbl  = Object.keys(table)[0]
    let attr = table[tbl]
    let hasStream = attr.hasOwnProperty('stream')
    let TableName = toLogicalID(tbl)

    if (hasStream) {

      // adds params to accept stream arn
      template.Parameters[`${TableName}Table`] = {
        Type: 'String',
        Description: 'Dynamo StreamArn'
      }

      // fix ref to stream arn
      let name = `${TableName}Stream`
      let code = `./src/tables/${tbl}`
      let prop = getPropertyHelper(arc, code) // helper function for getting props
      let env = getEnv(arc, code)

      template.Resources[name] = {
        Type: 'AWS::Serverless::Function',
        Properties: {
          Handler: 'index.handler',
          CodeUri: code,
          Runtime: prop('runtime'),
          MemorySize: prop('memory'),
          Timeout: prop('timeout'),
          Environment: {Variables: env},
          Role: {Ref: `Role`}
        },
        Events: {}
      }

      let concurrency = prop('concurrency')
      if (concurrency != 'unthrottled') {
        template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
      }

      let layers = prop('layers')
      if (Array.isArray(layers) && layers.length > 0) {
        template.Resources[name].Properties.Layers = layers
      }

      let policies = prop('policies')
      if (Array.isArray(policies) && policies.length > 0) {
        template.Resources[name].Properties.Policies = policies
      }

      let eventName = `${name}Event`
      template.Resources[eventName] = {
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: {
          BatchSize: 10,
          EventSourceArn: {'Fn::GetAtt': [`${TableName}Table`, 'StreamArn']},
          FunctionName: {'Fn::GetAtt': [name, 'Arn']},
          StartingPosition: 'TRIM_HORIZON'
        }
      }

    }
  })

  return template
}
