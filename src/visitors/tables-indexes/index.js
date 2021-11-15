let { toLogicalID } = require('@architect/utils')

let getGSI = require('./get-gsi-name')
let getKeySchema = require('../tables/get-key-schema')
let getAttributes = require('../tables/get-attribute-definitions')

/**
 * Visit @tables-indexes + @indexes and merge in AWS::Serverless resources
 */
module.exports = function visitTablesIndexes (inventory, template) {
  let { inv } = inventory
  if (!inv['tables-indexes'] && !inv.indexes) return template

  let indexes = inv['tables-indexes'] || inv.indexes

  indexes.forEach(index => {
    let name = toLogicalID(index.name)
    let TableName = `${name}Table`

    let IndexName = getGSI(index)
    let KeySchema = getKeySchema(index)
    let AttributeDefinitions = getAttributes(index)

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
    let tableDefs = ref.Properties.AttributeDefinitions
    ref.Properties.AttributeDefinitions = dedupe(tableDefs, AttributeDefinitions)
  })

  return template
}

function dedupe (tableDefs, indexDefs) {
  let table = [ ...tableDefs ]
  indexDefs.forEach(def => {
    let { AttributeName } = def
    if (!table.some(t => {
      return t.AttributeName === AttributeName
    })) table.push(def)
  })
  return table
}
