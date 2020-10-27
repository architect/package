module.exports = function _getGsiName (index) {
  let { name, partitionKey, partitionKeyType, sortKey } = index
  if (!partitionKey || !partitionKeyType) {
    throw Error(`Invalid @indexes: ${name}`)
  }
  let s = sortKey ? `-${sortKey}` : '' // Naming extension for multi-keys
  return `${partitionKey}${s}-index` // New school index naming
}
