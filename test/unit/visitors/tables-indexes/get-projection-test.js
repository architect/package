const { test } = require('node:test')
const assert = require('node:assert')
let inventory = require('@architect/inventory')
let getProjection = require('../../../../src/visitors/tables-indexes/get-projection')

let base = `@app
testapp

@tables
data
  id *String

@tables-indexes
data
  email *String
`
let $indexes = 'tables-indexes'

test('get-projection returns ALL if no projection specified', async () => {
  let { inv } = await inventory({ rawArc: `${base}` })
  let projection = getProjection(inv[$indexes][0])
  assert.strictEqual(projection.ProjectionType, 'ALL', 'projection type is ALL')
})

test('get-projection returns ALL if projection specified with "all"', async () => {
  let { inv } = await inventory({ rawArc: `${base}  projection all` })
  let projection = getProjection(inv[$indexes][0])
  assert.strictEqual(projection.ProjectionType, 'ALL', 'projection type is ALL')
})

test('get-projection returns KEYS_ONLY if projection specified with "keys"', async () => {
  let { inv } = await inventory({ rawArc: `${base}  projection keys` })
  let projection = getProjection(inv[$indexes][0])
  assert.strictEqual(projection.ProjectionType, 'KEYS_ONLY', 'projection type is KEYS_ONLY')
})

test('get-projection returns INCLUDE if projection specified with a string', async () => {
  let { inv } = await inventory({ rawArc: `${base}  projection firstName` })
  let projection = getProjection(inv[$indexes][0])
  assert.strictEqual(projection.ProjectionType, 'INCLUDE', 'projection type is INCLUDE')
  assert.strictEqual(projection.NonKeyAttributes[0], 'firstName', 'non key attribute set to specified string')
})

test('get-projection returns INCLUDE if projection specified with an array', async () => {
  let { inv } = await inventory({ rawArc: `${base}  projection firstName lastName` })
  let projection = getProjection(inv[$indexes][0])
  assert.strictEqual(projection.ProjectionType, 'INCLUDE', 'projection type is INCLUDE')
  assert.ok(projection.NonKeyAttributes.includes('firstName'), 'non key attributes include first projection attribute')
  assert.ok(projection.NonKeyAttributes.includes('lastName'), 'non key attributes include second projection attribute')
})
