let toLogicalID = require('@architect/utils/to-logical-id')

let clean = require('./clean')
let getTTL = require('./get-ttl')
let getHasLambda = require('./get-has-lambda')
let getKeySchema = require('./get-key-schema')
let getAttributes = require('./get-attribute-definitions')

let getEnv = require('../get-lambda-env')
let getPropertyHelper = require('../get-lambda-config')

/**
 * visit arc.tables and merge in AWS::Serverless resources
 */
module.exports = function tables(arc, template) {

  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  arc.tables.forEach(table=> {

    let tbl = Object.keys(table)[0]
    let attr = table[tbl]
    let keys = Object.keys(clean(attr))

    let KeySchema = getKeySchema(attr, keys)
    let hasTTL = getTTL(attr)
    let hasLambda = getHasLambda(attr)
    let TableName = toLogicalID(tbl)
    let AttributeDefinitions = getAttributes(clean(attr))

    template.Resources[`${TableName}Table`] = {
      Type: 'AWS::DynamoDB::Table',
      //DeletionPolicy: 'Retain',
      Properties: {
        KeySchema,
        AttributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
      }
    }

    if (hasTTL) {
      template.Resources[`${TableName}Table`].Properties.TimeToLiveSpecification = {
        AttributeName : hasTTL,
        Enabled: true
      }
    }

    /*
    template.Outputs[`${TableName}Table`] = {
      Description: 'Dynamo Table',
      Value: {Ref: `${TableName}Table`},
      Export: {
        Name: {'Fn::Join': [":", [appname, {Ref:'AWS::StackName'}, `${TableName}Table`]]}
      }
    }*/

    if (hasLambda) {
      // creates the stream
      template.Resources[`${TableName}Table`].Properties.StreamSpecification = {
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      }

      let name = `${TableName}Stream`
      let code = `./src/tables/${tbl}`
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
          }
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
