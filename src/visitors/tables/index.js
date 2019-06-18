let toLogicalID = require('@architect/utils/to-logical-id')
let clean = require('./clean')
let getTTL = require('./get-ttl')
let getKeySchema = require('./get-key-schema')
let getAttributeDefinitions = require('./get-attribute-definitions')

/**
 * visit arc.tables and merge in AWS::Serverless resources
 */
module.exports = function tables(arc, template) {

  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  let appname = toLogicalID(arc.app[0])

  arc.tables.forEach(table=> {

    let tbl = Object.keys(table)[0]
    let attr = table[tbl]
    let keys = Object.keys(clean(attr))

    let KeySchema = getKeySchema(attr, keys)
    let hasTTL = getTTL(attr)
    let TableName = toLogicalID(tbl)
    let AttributeDefinitions = getAttributeDefinitions(clean(attr))


    template.Resources[`${TableName}Table`] = {
      Type: 'AWS::DynamoDB::Table',
      //DeletionPolicy: 'Retain',
      Properties: {
        KeySchema,
        AttributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
        //StreamSpecification: StreamSpecification,
      }
    }

    if (hasTTL) {
      template.Resources[`${TableName}Table`].Properties.TimeToLiveSpecification = {
        AttributeName : hasTTL,
        Enabled: true
      }
    }

    template.Outputs[`${TableName}Table`] = {
      Description: 'A DynamoDB Table',
      Value: {Ref: `${TableName}Table`},
      Export: {
        Name: {
          'Fn::Join': [":", [appname, {Ref:'AWS::StackName'}, `${TableName}Table`]]
        }
      }
    }

    // TODO if stream defined
  })
  return template
}
