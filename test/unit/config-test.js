let parse = require('@architect/parser')
let test = require('tape')
let pkg = require('../../')

let arcfile = `@app
app
@events
foo

@aws
layers bar
policies foobar
`

test('can pkg w config', t => {
  t.plan(3)
  t.ok(pkg, 'pkg')
  let parsed = parse(arcfile)
  let props = pkg.toSAM(parsed).Resources.Foo.Properties
  t.ok(props.hasOwnProperty('Layers'), 'has layers')
  t.ok(props.hasOwnProperty('Policies'), 'has policies')
})

