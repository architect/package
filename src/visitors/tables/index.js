let { createLambda } = require('../utils')
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
      let theStream = get.streams(table.name)

      let streamLambda = `${name}StreamLambda`
      let streamEvent = `${name}StreamEvent`

      // Create the Lambda
      template.Resources[streamLambda] = createLambda({
        lambda: theStream,
        inventory,
      })

      template.Resources[streamEvent] = {
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: {
          BatchSize: 10,
          EventSourceArn: { 'Fn::GetAtt': [ tableTable, 'StreamArn' ] },
          FunctionName: { 'Fn::GetAtt': [ streamLambda, 'Arn' ] },
          StartingPosition: 'TRIM_HORIZON'
        }
      }

      // Create the stream
      template.Resources[tableTable].Properties.StreamSpecification = {
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      }
    }
  })

  return template
}
