const { test } = require('node:test')
const assert = require('node:assert')
let mockTmp = require('mock-tmp')
let inventory = require('@architect/inventory')
let package = require('../../')

let base =
`@app
app

@events
an-event
`
let deployStage = 'staging'

let layer = num => `arn:aws:lambda:us-west-2:foo:layer:bar:${num}`
let policy = num => `arn:aws:iam:foo:bar:${num}`
let arc = config => `${base}\n${config ? config : ''}`

let origRegion
test('Config test setup', () => {
  // dont let local env vars interfere with tests
  origRegion = process.env.AWS_REGION
  delete process.env.AWS_REGION
  assert.ok(true, 'Test env prepared')
})

test('Module is present', () => {
  assert.ok(package, 'Package module is present')
})

test('Basic config', async () => {
  let timeout = 10
  let memory = 3008
  let runtime = 'python3.13'
  let concurrency = 1337
  // let fifo = false

  let rawArc
  let inv
  let props

  // Control
  rawArc = arc()
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.notStrictEqual(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  assert.notStrictEqual(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  assert.notStrictEqual(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  assert.notStrictEqual(props['Concurrency'], concurrency, `Concurrency (control test, should be undefined): ${props['Concurrency']}`)
  // assert.notStrictEqual(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  assert.ok(!props['Layers'], `Layers (control test, not speficied)`)
  assert.ok(!props['Policies'], `Policies (control test, not speficied)`)
  assert.ok(props['Role'], `Role is present (because Policies are not specified)`)

  rawArc = arc(`@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers ${layer(1)}
policies ${policy(1)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  assert.strictEqual(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  assert.strictEqual(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  assert.strictEqual(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test, should be undefined): ${props['ReservedConcurrentExecutions']}`)
  // assert.strictEqual(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  assert.strictEqual(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Layers'][0]}`)
  assert.ok(!props['Role'], `Role is not present (because Policies are specified)`)
})

test('Config - layers & policies (vectors and scalars)', async () => {
  let rawArc
  let inv
  let props

  rawArc = arc(`@aws
layers ${layer(1)}
policies ${policy(1)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)

  rawArc = arc(`@aws
layers ${layer(1)}
layers ${layer(2)}
policies ${policy(1)}
policies ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 2, `Got multiple layers back (repeating 'layers')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Layers'][1], layer(2), `Layer matches: ${props['Layers'][1]}`)
  assert.strictEqual(props['Policies'].length, 2, `Got multiple policies back (repeating 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], policy(2), `Policy matches: ${props['Policies'][1]}`)

  rawArc = arc(`@aws
layers
  ${layer(1)}
  ${layer(2)}
policies
  ${policy(1)}
  ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 2, `Got multiple layers back (using 'layers' as an array)`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 2, `Got multiple policies back (using 'policies' as an array)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)


  rawArc = arc(`@aws
layer ${layer(1)}
policy ${policy(1)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 1, `Got a single layer back (using 'layer')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 1, `Got a single policy back (using 'policy')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)

  rawArc = arc(`@aws
layer ${layer(1)}
layer ${layer(2)}
policy ${policy(1)}
policy ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 2, `Got multiple layers back (repeating 'layer')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Layers'][1], layer(2), `Layer matches: ${props['Layers'][1]}`)
  assert.strictEqual(props['Policies'].length, 2, `Got multiple policies back (repeating 'policy')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], policy(2), `Policy matches: ${props['Policies'][1]}`)

  rawArc = arc(`@aws
layer
  ${layer(1)}
  ${layer(2)}
policy
  ${policy(1)}
  ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 2, `Got multiple layers back (using 'layer' as an array)`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 2, `Got multiple policies back (using 'policy' as an array)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
})

test('Config - Arc default policy opt-in', async () => {
  let rawArc
  let inv
  let props

  rawArc = arc(`@aws
policies
  ${policy(1)}
  foo
  bar
  architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (using 'policies' inline)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policies ${policy(1)} foo bar architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (using 'policies' inline)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policies ${policy(1)}
policies foo
policies bar
policies architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (repeating 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy
  ${policy(1)}
  foo
  bar
  architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (using 'policy' inline)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy ${policy(1)} foo bar architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (using 'policy' inline)`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy ${policy(1)}
policy foo
policy bar
policy architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Policies'].length, 4, `Got multiple policies back (repeating 'policy')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  assert.strictEqual(props['Policies'][1], 'foo', `Policy matches: foo`)
  assert.strictEqual(props['Policies'][2], 'bar', `Policy matches: bar`)
  assert.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)
})

test('Config - layer validation', async () => {
  let rawArc
  let inv
  let props

  rawArc = arc(`@aws
layers
  ${layer(1)}
  ${layer(2)}
  ${layer(3)}
  ${layer(4)}
  ${layer(5)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Layers'].length, 5, `Got up to 5 layers back`)

  rawArc = arc(`@aws
layers
  ${layer(1)}
  ${layer(2)}
  ${layer(3)}
  ${layer(4)}
  ${layer(5)}
  ${layer(6)}
`)
  try {
    let inv = await inventory({ rawArc, deployStage })
    package(inv)
    assert.fail('Should have thrown for too many layers')
  }
  catch {
    assert.ok(true, 'Too many layers fails')
  }

  rawArc = arc(`@aws
region us-west-1
layers a:b:c:us-west-2:d
`)
  try {
    let inv = await inventory({ rawArc, deployStage })
    package(inv)
    assert.fail('Should have thrown for incorrect layer region')
  }
  catch {
    assert.ok(true, 'Incorrect (.arc) layer region fails')
  }

  process.env.AWS_REGION = 'us-west-1'
  rawArc = arc(`@aws
layers a:b:c:us-west-2:d
`)
  try {
    let inv = await inventory({ rawArc, deployStage })
    package(inv)
    assert.fail('Should have thrown for incorrect layer region')
  }
  catch {
    assert.ok(true, 'Incorrect (env) layer region fails')
  }
  delete process.env.AWS_REGION
})

test('.arc-config overrides root config', async () => {
  let timeout = 10
  let memory = 3008
  let runtime = 'python3.13'
  let concurrency = 1337

  // Control
  let rawArc = arc(`@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers ${layer(1)}
policies ${policy(1)}
`)
  let inv = await inventory({ rawArc, deployStage })
  let props = package(inv).Resources.AnEventEventLambda.Properties
  assert.strictEqual(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  assert.strictEqual(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  assert.strictEqual(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  assert.strictEqual(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test): ${props['ReservedConcurrentExecutions']}`)
  assert.strictEqual(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  assert.strictEqual(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  assert.strictEqual(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(1), `Policy matches: ${props['Layers'][0]}`)

  // Overlay settings
  timeout = 15
  memory = 128
  runtime = 'ruby3.3'
  concurrency = 100
  let arcConfig = `@aws
timeout ${timeout}
memory ${memory}
runtime ${runtime}
concurrency ${concurrency}
layers ${layer(2)}
policies ${policy(2)}
`
  let tmp = mockTmp({
    'src/events/an-event/.arc-config': Buffer.from(arcConfig),
  })
  inv = await inventory({ cwd: tmp, rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  mockTmp.reset()
  assert.strictEqual(props['Timeout'], timeout, `Timeout: ${props['Timeout']}`)
  assert.strictEqual(props['MemorySize'], memory, `Memory: ${props['MemorySize']}`)
  assert.strictEqual(props['Runtime'], runtime, `Runtime: ${props['Runtime']}`)
  assert.strictEqual(props['ReservedConcurrentExecutions'], concurrency, `Concurrency: ${props['ReservedConcurrentExecutions']}`)
  assert.strictEqual(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  assert.strictEqual(props['Layers'][0], layer(2), `Layer matches: ${props['Layers'][1]}`)
  assert.strictEqual(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  assert.strictEqual(props['Policies'][0], policy(2), `Policy matches: ${props['Layers'][1]}`)
})

test('Function type specific settings', async () => {
  // Control
  let rawArc = arc(`@queues
a-queue
`)
  let inv = await inventory({ rawArc, deployStage })
  let props = package(inv).Resources.AQueueQueue.Properties
  assert.ok(props['FifoQueue'], `FifoQueue is set by default: ${props['FifoQueue']}`)
  assert.ok(props['ContentBasedDeduplication'], `ContentBasedDeduplication is set by default: ${props['ContentBasedDeduplication']}`)

  rawArc = arc(`@queues
a-queue

@aws
fifo false
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AQueueQueue.Properties
  assert.ok(!props['FifoQueue'], `FifoQueue disabled by setting`)
  assert.ok(!props['ContentBasedDeduplication'], `ContentBasedDeduplication disabled by setting`)
})

test('Older AWS regions uses older static url format', async () => {
  let olderFormat = 'http://${bukkit}.s3-website-${AWS::Region}.amazonaws.com'
  let olderRegions = [
    'us-east-1',
    'us-west-1',
    'us-west-2',
    'us-gov-west-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'sa-east-1',
    'eu-west-1',
  ]
  for (const region of olderRegions) {
    let rawArc = arc(
      `@aws
region ${region}

@static
`)
    let inv = await inventory({ rawArc, deployStage })
    let bucketUrl = package(inv).Outputs.BucketURL.Value['Fn::Sub'][0]
    assert.strictEqual(bucketUrl, olderFormat, `${region} uses older format`)
  }
})

test('Newer AWS regions uses newer static url format', async () => {
  let newerFormat = 'http://${bukkit}.s3-website.${AWS::Region}.amazonaws.com'
  let region = 'eu-central-1'
  let rawArc = arc(
    `@aws
region ${region}

@static
`)
  let inv = await inventory({ rawArc, deployStage })
  let bucketUrl = package(inv).Outputs.BucketURL.Value['Fn::Sub'][0]
  assert.strictEqual(bucketUrl, newerFormat, `${region} uses newer format`)
})

test('Config test teardown', () => {
  process.env.AWS_REGION = origRegion
  assert.ok(true, 'Test env torn down')
})
