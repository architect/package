const { test } = require('node:test')
const assert = require('node:assert')
let gsiName = require('../../../../src/visitors/tables-indexes/get-gsi-name')

let index = {
  name: 'accounts',
  partitionKeyType: 'string',
  partitionKey: 'email',
}

test('get-gsi-name should throw is no partition key or partition key type is provided', () => {
  assert.throws(() => {
    gsiName({ name: 'index' })
  }, { message: 'Invalid @indexes: index' })
  assert.throws(() => {
    gsiName({ name: 'accounts', partitionKey: 'email' })
  }, { message: 'Invalid @indexes: accounts' })
  assert.throws(() => {
    gsiName({ name: 'accounts', partitionKeyType: 'string' })
  }, { message: 'Invalid @indexes: accounts' })
  assert.doesNotThrow(() => {
    gsiName(index)
  })
})

test('get-gsi-name should return an index name based on the partition key if no sort key or provided index name are present', () => {
  assert.strictEqual(gsiName(index), 'email-index', 'correct name returned')
})

test('get-gsi-name should return an index name based on the partition key and sort key if no provided index name is present', () => {
  let idx = Object.assign({ sortKey: 'createdAt' }, index)
  assert.strictEqual(gsiName(idx), 'email-createdAt-index', 'correct name returned')
})

test('get-gsi-name should return provided index name if present', () => {
  let idx = Object.assign({ indexName: 'MyCustomIndex' }, index)
  assert.strictEqual(gsiName(idx), 'MyCustomIndex', 'custom index name returned')
})
