let getAttributeDefinitions = require('../tables/get-attribute-definitions')
let { toLogicalID } = require('@architect/utils')
let getGSI = require('./get-gsi-name')
let getKeySchema = require('../tables/get-key-schema')
let clean = require('../tables/clean')
/**
 * visit arc.indexes and merge in AWS::Serverless resources
 */
module.exports = function visitIndexes (arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  arc.indexes.forEach(index => {

    let tbl = Object.keys(index)[0]
    let attr = index[tbl]
    let keys = Object.keys(clean(attr))

    let TableName = `${toLogicalID(tbl)}Table`
    let IndexName = getGSI(attr)
    let KeySchema = getKeySchema(attr, keys)
    let Projection = { ProjectionType: 'ALL' }

    let ref = template.Resources[TableName]
    if (!ref)
      throw ReferenceError('@indexes failure: ' + TableName + ' is undefined')

    // write in the index
    if (!ref.Properties.GlobalSecondaryIndexes)
      ref.Properties.GlobalSecondaryIndexes = []

    ref.Properties.GlobalSecondaryIndexes.push({
      IndexName,
      KeySchema,
      Projection,
    })

    // ensure the attribute defns match
    ref.Properties.AttributeDefinitions = dedup(ref, attr)
  })

  return template
}

function dedup (ref, attr) {
  let tmp = {}
  // write in current attrs
  ref.Properties.AttributeDefinitions.forEach(def => {
    tmp[def.AttributeName] = def.AttributeType
  })
  // overwrite w key schema values
  let schemas = getAttributeDefinitions(attr)
  schemas.forEach(def => {
    tmp[def.AttributeName] = def.AttributeType
  })
  // reseralize into cfn
  return Object.keys(tmp).map(key => {
    return {
      AttributeName: key,
      AttributeType: tmp[key]
    }
  })
}
