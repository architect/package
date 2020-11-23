module.exports = function getAttributeDefinitions (table) {
  let defs = []
  let { partitionKey, partitionKeyType, sortKey, sortKeyType } = table

  // Always handle partition key
  defs.push({
    AttributeName: partitionKey,
    AttributeType: convert(partitionKeyType)
  })

  // Handle sort key if necessary
  if (sortKey) {
    defs.push({
      AttributeName: sortKey,
      AttributeType: convert(sortKeyType)
    })
  }

  return defs
}

function convert (v) {
  return ({
    'String': 'S',
    'Number': 'N'
  })[v]
}
