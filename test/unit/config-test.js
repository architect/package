let mockTmp = require('mock-tmp')
let inventory = require('@architect/inventory')
let test = require('tape')
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
test('Config test setup', t => {
  t.plan(1)
  // dont let local env vars interfere with tests
  origRegion = process.env.AWS_REGION
  delete process.env.AWS_REGION
  t.pass('Test env prepared')
})

test('Module is present', t => {
  t.plan(1)
  t.ok(package, 'Package module is present')
})

test('Basic config', async t => {
  t.plan(16)

  let timeout = 10
  let memory = 3008
  let runtime = 'python3.8'
  let concurrency = 1337
  // let fifo = false

  let rawArc
  let inv
  let props

  // Control
  rawArc = arc()
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.notEqual(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.notEqual(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.notEqual(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.notEqual(props['Concurrency'], concurrency, `Concurrency (control test, should be undefined): ${props['Concurrency']}`)
  // t.notEqual(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  t.notOk(props['Layers'], `Layers (control test, not speficied)`)
  t.notOk(props['Policies'], `Policies (control test, not speficied)`)
  t.ok(props['Role'], `Role is present (because Policies are not specified)`)

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
  t.equal(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test, should be undefined): ${props['ReservedConcurrentExecutions']}`)
  // t.equal(props['Fifo'], fifo, `Fifo (control test): ${props['Fifo']}`)
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Layers'][0]}`)
  t.notOk(props['Role'], `Role is not present (because Policies are specified)`)
})

test('Config - layers & policies (vectors and scalars)', async t => {
  t.plan(28)

  let rawArc
  let inv
  let props

  rawArc = arc(`@aws
layers ${layer(1)}
policies ${policy(1)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)

  rawArc = arc(`@aws
layers ${layer(1)}
layers ${layer(2)}
policies ${policy(1)}
policies ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Layers'].length, 2, `Got multiple layers back (repeating 'layers')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Layers'][1], layer(2), `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 2, `Got multiple policies back (repeating 'policies')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], policy(2), `Policy matches: ${props['Policies'][1]}`)

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
  t.equal(props['Layers'].length, 2, `Got multiple layers back (using 'layers' as an array)`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 2, `Got multiple policies back (using 'policies' as an array)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)


  rawArc = arc(`@aws
layer ${layer(1)}
policy ${policy(1)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layer')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policy')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)

  rawArc = arc(`@aws
layer ${layer(1)}
layer ${layer(2)}
policy ${policy(1)}
policy ${policy(2)}
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Layers'].length, 2, `Got multiple layers back (repeating 'layer')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Layers'][1], layer(2), `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 2, `Got multiple policies back (repeating 'policy')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], policy(2), `Policy matches: ${props['Policies'][1]}`)

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
  t.equal(props['Layers'].length, 2, `Got multiple layers back (using 'layer' as an array)`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 2, `Got multiple policies back (using 'policy' as an array)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
})

test('Config - Arc default policy opt-in', async t => {
  t.plan(30)

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
  t.equal(props['Policies'].length, 4, `Got multiple policies back (using 'policies' inline)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policies ${policy(1)} foo bar architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Policies'].length, 4, `Got multiple policies back (using 'policies' inline)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policies ${policy(1)}
policies foo
policies bar
policies architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Policies'].length, 4, `Got multiple policies back (repeating 'policies')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy
  ${policy(1)}
  foo
  bar
  architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Policies'].length, 4, `Got multiple policies back (using 'policy' inline)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy ${policy(1)} foo bar architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Policies'].length, 4, `Got multiple policies back (using 'policy' inline)`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)

  rawArc = arc(`@aws
policy ${policy(1)}
policy foo
policy bar
policy architect-default-policies
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AnEventEventLambda.Properties
  t.equal(props['Policies'].length, 4, `Got multiple policies back (repeating 'policy')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Policies'][0]}`)
  t.equal(props['Policies'][1], 'foo', `Policy matches: foo`)
  t.equal(props['Policies'][2], 'bar', `Policy matches: bar`)
  t.ok(props['Policies'][3].Statement, `Embedded policy statement added by 'architect-default-policies'`)
})

test('Config - layer validation', async t => {
  t.plan(4)

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
  t.equal(props['Layers'].length, 5, `Got up to 5 layers back`)

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
  }
  catch {
    t.pass('Too many layers fails')
  }

  rawArc = arc(`@aws
region us-west-1
layers a:b:c:us-west-2:d
`)
  try {
    let inv = await inventory({ rawArc, deployStage })
    package(inv)
  }
  catch {
    t.pass('Incorrect (.arc) layer region fails')
  }

  process.env.AWS_REGION = 'us-west-1'
  rawArc = arc(`@aws
layers a:b:c:us-west-2:d
`)
  try {
    let inv = await inventory({ rawArc, deployStage })
    package(inv)
  }
  catch {
    t.pass('Incorrect (env) layer region fails')
  }
  delete process.env.AWS_REGION
})

test('.arc-config overrides root config', async t => {
  t.plan(16)

  let timeout = 10
  let memory = 3008
  let runtime = 'python3.9'
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
  t.equal(props['Timeout'], timeout, `Timeout (control test): ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory (control test): ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime (control test): ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency (control test): ${props['ReservedConcurrentExecutions']}`)
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], layer(1), `Layer matches: ${props['Layers'][0]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], policy(1), `Policy matches: ${props['Layers'][0]}`)

  // Overlay settings
  timeout = 15
  memory = 128
  runtime = 'ruby3.2'
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
  t.equal(props['Timeout'], timeout, `Timeout: ${props['Timeout']}`)
  t.equal(props['MemorySize'], memory, `Memory: ${props['MemorySize']}`)
  t.equal(props['Runtime'], runtime, `Runtime: ${props['Runtime']}`)
  t.equal(props['ReservedConcurrentExecutions'], concurrency, `Concurrency: ${props['ReservedConcurrentExecutions']}`)
  t.equal(props['Layers'].length, 1, `Got a single layer back (using 'layers')`)
  t.equal(props['Layers'][0], layer(2), `Layer matches: ${props['Layers'][1]}`)
  t.equal(props['Policies'].length, 1, `Got a single policy back (using 'policies')`)
  t.equal(props['Policies'][0], policy(2), `Policy matches: ${props['Layers'][1]}`)
})

test('Function type specific settings', async t => {
  t.plan(4)

  // Control
  let rawArc = arc(`@queues
a-queue
`)
  let inv = await inventory({ rawArc, deployStage })
  let props = package(inv).Resources.AQueueQueue.Properties
  t.ok(props['FifoQueue'], `FifoQueue is set by default: ${props['FifoQueue']}`)
  t.ok(props['ContentBasedDeduplication'], `ContentBasedDeduplication is set by default: ${props['ContentBasedDeduplication']}`)

  rawArc = arc(`@queues
a-queue

@aws
fifo false
`)
  inv = await inventory({ rawArc, deployStage })
  props = package(inv).Resources.AQueueQueue.Properties
  t.notOk(props['FifoQueue'], `FifoQueue disabled by setting`)
  t.notOk(props['ContentBasedDeduplication'], `ContentBasedDeduplication disabled by setting`)
})

test('Older AWS regions uses older static url format', async t => {
  t.plan(9)

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
    t.equal(bucketUrl, olderFormat, `${region} uses older format`)
  }
})

test('Newer AWS regions uses newer static url format', async t => {
  t.plan(1)

  let newerFormat = 'http://${bukkit}.s3-website.${AWS::Region}.amazonaws.com'
  let region = 'eu-central-1'
  let rawArc = arc(
    `@aws
region ${region}

@static
`)
  let inv = await inventory({ rawArc, deployStage })
  let bucketUrl = package(inv).Outputs.BucketURL.Value['Fn::Sub'][0]
  t.equal(bucketUrl, newerFormat, `${region} uses newer format`)
})

test('Config test teardown', t => {
  t.plan(1)
  process.env.AWS_REGION = origRegion
  t.pass('Test env torn down')
})
