let test = require('tape')
let inventory = require('@architect/inventory')
let getProjection = require('../../../../src/visitors/indexes/get-projection')

let base = `@app
testapp

@tables
data
  id *String

@indexes
data
  email *String
`

test('get-projection returns ALL if no projection specified', async t => {
  t.plan(1)
  let { inv } = await inventory({ rawArc: `${base}` })
  let projection = getProjection(inv.indexes[0])
  t.equals(projection.ProjectionType, 'ALL', 'projection type is ALL')
})

test('get-projection returns ALL if projection specified with "all"', async t => {
  t.plan(1)
  let { inv } = await inventory({ rawArc: `${base}  projection all` })
  let projection = getProjection(inv.indexes[0])
  t.equals(projection.ProjectionType, 'ALL', 'projection type is ALL')
})

test('get-projection returns KEYS_ONLY if projection specified with "keys"', async t => {
  t.plan(1)
  let { inv } = await inventory({ rawArc: `${base}  projection keys` })
  let projection = getProjection(inv.indexes[0])
  t.equals(projection.ProjectionType, 'KEYS_ONLY', 'projection type is KEYS_ONLY')
})

test('get-projection returns INCLUDE if projection specified with a string', async t => {
  t.plan(2)
  let { inv } = await inventory({ rawArc: `${base}  projection firstName` })
  let projection = getProjection(inv.indexes[0])
  t.equals(projection.ProjectionType, 'INCLUDE', 'projection type is INCLUDE')
  t.equals(projection.NonKeyAttributes[0], 'firstName', 'non key attribute set to specified string')
})

test('get-projection returns INCLUDE if projection specified with an array', async t => {
  t.plan(3)
  let { inv } = await inventory({ rawArc: `${base}  projection firstName lastName` })
  let projection = getProjection(inv.indexes[0])
  t.equals(projection.ProjectionType, 'INCLUDE', 'projection type is INCLUDE')
  t.ok(projection.NonKeyAttributes.includes('firstName'), 'non key attributes include first projection attribute')
  t.ok(projection.NonKeyAttributes.includes('lastName'), 'non key attributes include second projection attribute')
})
