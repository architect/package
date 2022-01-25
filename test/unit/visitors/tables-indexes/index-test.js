let test = require('tape')
let inventory = require('@architect/inventory')
let visit = require('../../../../src/visitors/tables-indexes')
let tables = require('../../../../src/visitors/tables')
let base =
`@app
app

@tables
surfboards
  nickname *String
`
let deployStage = 'staging'
let arc = config => `${base}\n${config ? config : ''}`
let cfn = () => JSON.parse(JSON.stringify({ Resources: {} }))

test('index visitor should return untouched template if inventory contains no indexes', async t => {
  t.plan(1)
  let rawArc = arc()
  let inv = await inventory({ rawArc, deployStage })
  let template = tables(inv, cfn())
  let output = visit(inv, template)
  t.equals(JSON.stringify(template), JSON.stringify(output), 'app without indexes do not change cfn template')
})

test('index visitor should support named indexes', async t => {
  t.plan(1)
  let rawArc = arc('@tables-indexes\nsurfboards\n  name ByMake\n  make *String')
  let inv = await inventory({ rawArc, deployStage })
  let template = tables(inv, cfn())
  let output = visit(inv, template)
  let indexName = output.Resources.SurfboardsTable.Properties.GlobalSecondaryIndexes[0].IndexName
  t.equals(indexName, 'ByMake', 'index name honoured')
})

test('index visitor should set proper key schema for any generated indexes', async t => {
  t.plan(2)
  let rawArc = arc('@tables-indexes\nsurfboards\n  make *String\n  birthday **String')
  let inv = await inventory({ rawArc, deployStage })
  let template = tables(inv, cfn())
  let output = visit(inv, template)
  let gsi = output.Resources.SurfboardsTable.Properties.GlobalSecondaryIndexes[0]
  let hashKey = gsi.KeySchema.find(k => k.KeyType === 'HASH')
  let sortKey = gsi.KeySchema.find(k => k.KeyType === 'RANGE')
  t.equals(hashKey.AttributeName, 'make', 'got correct index hash key')
  t.equals(sortKey.AttributeName, 'birthday', 'got correct index sort key')
})

test('index visitor should aggregate and dedupeindex keys into table attribute definitions', async t => {
  t.plan(3)
  let rawArc = arc('@tables-indexes\nsurfboards\n  make *String\n  nickname **String')
  let inv = await inventory({ rawArc, deployStage })
  let template = tables(inv, cfn())
  let output = visit(inv, template)
  let attrs = output.Resources.SurfboardsTable.Properties.AttributeDefinitions
  t.equals(attrs.length, 2, 'two unique attributes exist and are specified')
  t.ok(attrs.find(a => a.AttributeName === 'nickname'), 'main table hash key listed in table attribute definitions')
  t.ok(attrs.find(a => a.AttributeName === 'make'), 'index hash key listed in table attribute definitions')
})
