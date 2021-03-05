let test = require('tape')
let inv = require('@architect/inventory')
let json = require('../../createLambdaJSON')
let mockFs = require('mock-fs')
let fs = require('fs')
let { join } = require('path')
let base = fs.readFileSync(join(__dirname, '.arc-short')).toString()
let inventory

test('Setup env', async t => {
  t.plan(1)
  inventory = await inv({ rawArc: base })
  t.ok(inv, 'Inventory loaded')
})

test('createLambdaJSON should return a CFN definition with correct config.arc function configuration overrides', t => {
  t.plan(1)
  mockFs({
    'src/lambda/one/config.arc': '@aws\nmemory 1337'
  })
  let result = json({ inventory, src: join('src', 'lambda', 'one') })
  mockFs.restore()
  let defn = result[1]
  t.equals(defn.Properties.MemorySize, 1337, 'Correct memory override read')
})

test('createLambdaJSON should return a properly formatted name based on the provided path to the function', t => {
  t.plan(1)
  mockFs({
    'src/lambda/comb-the-desert/config.arc': '@aws\nmemory 1337'
  })
  let result = json({ inventory, src: join('src', 'lambda', 'comb-the-desert') })
  mockFs.restore()
  let name = result[0]
  t.equals(name, 'LambdaCombTheDesertPluginLambda', 'Lambda name is PascalCase, prefix is based on path after src/ and ends with PluginLambda')
})

test('createLambdaJSON should return a properly formatted name based on the provided path to the function (even if path is absolute)', t => {
  t.plan(1)
  mockFs({
    'src/timestream/dont-cross-them/config.arc': '@aws\nmemory 1337'
  })
  let result = json({ inventory, src: join(process.cwd(), 'src', 'timestream', 'dont-cross-them') })
  mockFs.restore()
  let name = result[0]
  t.equals(name, 'TimestreamDontCrossThemPluginLambda', 'Lambda name is PascalCase, prefix is based on path after src/ and ends with PluginLambda')
})

test('createLambdaJSON should return a CFN definition with proper path', t => {
  t.plan(1)
  mockFs({
    'src/lambda/beepboop/config.arc': '@aws\nmemory 1337'
  })
  let result = json({ inventory, src: join('src', 'lambda', 'beepboop') })
  mockFs.restore()
  let defn = result[1]
  t.equals(defn.Properties.CodeUri, join('src', 'lambda', 'beepboop'), 'Correct CodeUri set based on local path')
})
