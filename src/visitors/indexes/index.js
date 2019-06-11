let toLogicalID = require('@architect/utils/to-logical-id')
let getGSI = require('./get-gsi-name')
let getKeySchema = require('../tables/get-key-schema')
let clean = require('../tables/clean')
/**
 * visit arc.indexes and merge in AWS::Serverless resources
 */
module.exports = function indices(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  arc.indexes.forEach(index=> {

    let tbl = Object.keys(index)[0]
    let attr = index[tbl]
    let keys = Object.keys(clean(attr))
    let TableName = `${toLogicalID(tbl)}Table`
    let ref = template.Resources[TableName]

    if (!ref)
      throw ReferenceError('@indexes failure: ' + TableName + ' is undefined')

    ref.Properties.GlobalSecondaryIndexes = [{
      IndexName: getGSI(attr),
      KeySchema: getKeySchema(attr, keys),
      Projection: {ProjectionType: 'ALL'}
    }]
  })

  return template
}
