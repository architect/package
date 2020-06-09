let parse = require('@architect/parser')
let test = require('tape')
let package = require('../../')
let mockFs = require('mock-fs')

let base =
`@app
app

@events
an-event
`
let arc = config => `${base}\n${config ? config : ''}`

test('Module is present', t => {
  t.plan(1)
  t.ok(package, 'Package module is present')
})

test('Basic config', t => {
  t.plan(14)

  let timeout = 10
  let memory = 3008
  let runtime = 'python3.8'
  let concurrency = 1337
  // let fifo = false

  // Control
  let arcfile = arc()
  let parsed = parse(arcfile)
  let props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.notEqual(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.notEqual(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.notEqual(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.notEqual(props['Concurrency'], concurrency, `Concurrency (control test, should be undefined): ${props['Concurrency']}`)
  // t.notEqual(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  t.notOk(props['Layers'], `Layers (control test, not speficied)`)
  t.notOk(props['Policies'], `Policies (control test, not speficied)`)

  arcfile = arc(`@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers foo
policies fiz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test, should be undefined): ${props['ReservedConcurrentExecutions']}`)
  // t.equal(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)
})

test('Config - layers & policies (vectors and scalars)', t => {
  t.plan(28)

  let arcfile = arc(`@aws
layers foo
policies fiz
`)
  let parsed = parse(arcfile)
  let props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)

  arcfile = arc(`@aws
layers foo
layers bar
policies fiz
policies buz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 2, `Got a multiple layers back (repeating 'layers')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Layers'][1], 'bar', `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 2, `Got a multiple policys back (repeating 'policies')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'][1], 'buz', `Policy matches: ${props['Layers'][1]}`)

  arcfile = arc(`@aws
layers
  foo
  bar
policies
  fiz
  buz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 2, `Got a multiple layers back (using 'layers' as an array)`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 2, `Got a multiple policys back (using 'policies' as an array)`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)


  arcfile = arc(`@aws
layer foo
policy fiz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layer')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policy')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)

  arcfile = arc(`@aws
layer foo
layer bar
policy fiz
policy buz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 2, `Got a multiple layers back (repeating 'layer')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Layers'][1], 'bar', `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 2, `Got a multiple policys back (repeating 'policy')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'][1], 'buz', `Policy matches: ${props['Layers'][1]}`)

  arcfile = arc(`@aws
layer
  foo
  bar
policy
  fiz
  buz
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 2, `Got a multiple layers back (using 'layer' as an array)`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 2, `Got a multiple policys back (using 'policy' as an array)`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)
})

test('Config - layers limits', t => {
  t.plan(2)

  let arcfile = arc(`@aws
layers
  foo
  bar
  baz
  fiz
  buz
`)
  let parsed = parse(arcfile)
  let props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Layers'].length, 5, `Got up to 5 layers back`)

  t.throws(() => {
    let arcfile = arc(`@aws
layers
  foo
  bar
  baz
  fiz
  buz
  quux
`)
    let parsed = parse(arcfile)
    package.toSAM(parsed)
  }, 'Too many layers throws')
})

test('.arc-config overrides root config', t => {
  t.plan(18)

  let timeout = 10
  let memory = 3008
  let runtime = 'python3.8'
  let concurrency = 1337

  // Control
  let arcfile = arc(`@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers foo
policies fiz
`)
  let parsed = parse(arcfile)
  let props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test): ${props['ReservedConcurrentExecutions']}`)
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)

  // Overlay settings
  timeout = 15
  memory = 128
  runtime = 'ruby2.5'
  concurrency = 100
  let arcConfig = `@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers lol
policies weee
`
  mockFs({
    'src/events/an-event/.arc-config': Buffer.from(arcConfig)
  })
  props = package.toSAM(parsed).Resources.AnEvent.Properties
  t.equal(props['Timeout'], timeout, `Timeout: ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory: ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime: ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency: ${props['ReservedConcurrentExecutions']}`)
  t.equal(props['Layers'].length, 2, `Got a multiple layers back`)
  t.equal(props['Layers'][0], 'foo', `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Layers'][1], 'lol', `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 2, `Got a multiple policies back`)
  t.equal(props['Policies'][0], 'fiz', `Policy matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'][1], 'weee', `Policy matches: ${props['Layers'][1]}`)
})

test('Function type specific settings', t => {
  t.plan(4)

  // Control
  let arcfile = arc(`@queues
a-queue
`)
  let parsed = parse(arcfile)
  let props = package.toSAM(parsed).Resources.AQueueQueue.Properties
  t.ok(props['FifoQueue'], `FifoQueue is set by default: ${props['FifoQueue']}`)
  t.ok(props['ContentBasedDeduplication'], `ContentBasedDeduplication is set by default: ${props['ContentBasedDeduplication']}`)

  arcfile = arc(`@queues
a-queue

@aws
fifo false
`)
  parsed = parse(arcfile)
  props = package.toSAM(parsed).Resources.AQueueQueue.Properties
  t.notOk(props['FifoQueue'], `FifoQueue disabled by setting`)
  t.notOk(props['ContentBasedDeduplication'], `ContentBasedDeduplication disabled by setting`)
})
