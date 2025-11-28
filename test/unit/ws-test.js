const { test } = require('node:test')
const assert = require('node:assert')
let inventory = require('@architect/inventory')
let pkg = require('../../')

let rawArc = `
@app
myapp
@ws
`
let deployStage = 'staging'

test('WebSockets have a policy doc', async () => {
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)
  assert.ok(pkg, 'pkg')
  assert.ok(cfn.Resources.WebSocketPolicy, 'WebSocketPolicy')
})
