let inventory = require('@architect/inventory')
let test = require('tape')
let pkg = require('../../')

let rawArc = `
@app
myapp
@ws
`
let deployStage = 'staging'

test('WebSockets have a policy doc', async t => {
  t.plan(2)
  let inv = await inventory({ rawArc, deployStage })
  let cfn = pkg(inv)
  t.ok(pkg, 'pkg')
  t.ok(cfn.Resources.WebSocketPolicy, 'WebSocketPolicy')
})
