let { getLambdaEnv } = require('../utils')
let { toLogicalID } = require('@architect/utils')

let getKeySchema = require('./get-key-schema')
let getAttributes = require('./get-attribute-definitions')

/**
 * Visit arc.tables and merge in AWS::Serverless resources
 */
module.exports = function visitTables (inventory, template) {
  let { inv, get } = inventory
  if (!inv.tables) return template

  inv.tables.forEach(table => {
    let {
      stream,
      ttl,
      encrypt,
      PointInTimeRecovery,
    } = table

    let name = toLogicalID(table.name)
    let tableTable = `${name}Table`

    let KeySchema = getKeySchema(table)
    let AttributeDefinitions = getAttributes(table)

    template.Resources[tableTable] = {
      Type: 'AWS::DynamoDB::Table',
      // DeletionPolicy: 'Retain',
      Properties: {
        KeySchema,
        AttributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
      }
    }

    if (encrypt) {
      let encryptSpec = { SSEEnabled: true }
      if (typeof encrypt !== 'boolean') {
        encryptSpec.KMSMasterKeyId = encrypt
        encryptSpec.SSEType = 'KMS'
      }
      template.Resources[tableTable].Properties.SSESpecification = encryptSpec
    }

    if (PointInTimeRecovery) {
      template.Resources[tableTable].Properties.PointInTimeRecoverySpecification = {
        PointInTimeRecoveryEnabled: true
      }
    }

    if (ttl) {
      template.Resources[tableTable].Properties.TimeToLiveSpecification = {
        AttributeName: ttl,
        Enabled: true
      }
    }

    // TODO impl for multiple streams against a single table, now possible!
    if (stream) {
      // creates the stream
      template.Resources[tableTable].Properties.StreamSpecification = {
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      }

      let { src, config } = get.streams(table.name)
      let { timeout, memory, runtime, handler, concurrency, layers, policies } = config

      let streamStream = `${name}Stream`
      let streamLambda = `${name}StreamLambda`
      let streamEvent = `${name}StreamEvent`
      let env = getLambdaEnv(runtime, inventory)

      template.Resources[streamLambda] = {
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
        },
        Events: {}
      }

      if (concurrency !== 'unthrottled') {
        template.Resources[streamLambda].Properties.ReservedConcurrentExecutions = concurrency
      }

      if (layers.length > 0) {
        template.Resources[streamLambda].Properties.Layers = layers
      }

      if (policies.length > 0) {
        template.Resources[streamLambda].Properties.Policies = policies
      }

      template.Resources[streamEvent] = {
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: {
          BatchSize: 10,
          EventSourceArn: { 'Fn::GetAtt': [ tableTable, 'StreamArn' ] },
          FunctionName: { 'Fn::GetAtt': [ streamStream, 'Arn' ] },
          StartingPosition: 'TRIM_HORIZON'
        }
      }
    }
  })

  return template
}
