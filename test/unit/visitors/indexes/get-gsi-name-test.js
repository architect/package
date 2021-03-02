let test = require('tape')
let gsiName = require('../../../../src/visitors/indexes/get-gsi-name')

let index = {
  name: 'accounts',
  partitionKeyType: 'string',
  partitionKey: 'email'
}

test('get-gsi-name should throw is no partition key or partition key type is provided', t => {
  t.plan(4)
  t.throws(() => {
    gsiName({ name: 'index' })
  }, { message: 'Invalid @indexes: index' })
  t.throws(() => {
    gsiName({ name: 'accounts', partitionKey: 'email' })
  }, { message: 'Invalid @indexes: accounts' })
  t.throws(() => {
    gsiName({ name: 'accounts', partitionKeyType: 'string' })
  }, { message: 'Invalid @indexes: accounts' })
  t.doesNotThrow(() => {
    gsiName(index)
  })
})

test('get-gsi-name should return an index name based on the partition key if no sort key or provided index name are present', t => {
  t.plan(1)
  t.equals(gsiName(index), 'email-index', 'correct name returned')
})

test('get-gsi-name should return an index name based on the partition key and sort key if no provided index name is present', t => {
  t.plan(1)
  let idx = Object.assign({ sortKey: 'createdAt' }, index)
  t.equals(gsiName(idx), 'email-createdAt-index', 'correct name returned')
})

test('get-gsi-name should return provided index name if present', t => {
  t.plan(1)
  let idx = Object.assign({ indexName: 'MyCustomIndex' }, index)
  t.equals(gsiName(idx), 'MyCustomIndex', 'custom index name returned')
})
