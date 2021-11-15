let { toLogicalID } = require('@architect/utils')

let getKeySchema = require('./get-key-schema')
let getAttributes = require('./get-attribute-definitions')

/**
 * Visit arc.tables and merge in AWS::Serverless resources
 */
module.exports = function visitTables (inventory, template) {
  let { inv } = inventory
  if (!inv.tables) return template

  inv.tables.forEach(table => {
    let { ttl, encrypt, pitr } = table // Streams are handled by Inventory

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

    if (pitr || table.PointInTimeRecovery) {
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
  })

  return template
}
