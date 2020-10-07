module.exports = function _getGsiName (index) {
  let { indexName, name, partitionKey, partitionKeyType, sortKey } = index
  if (!partitionKey || !partitionKeyType) {
    throw Error(`Invalid @indexes: ${name}`)
  }

  if (typeof indexName === 'string' && indexName.length > 0) {
    return indexName
  }

  let s = sortKey ? `-${sortKey}` : '' // Naming extension for multi-keys
  return `${partitionKey}${s}-index` // New school index naming
}
