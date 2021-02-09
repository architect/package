let test = require('tape')
let inventory = require('@architect/inventory')
let json = require('../../createLambdaJSON')
let mockFs = require('mock-fs')
let fs = require('fs')
let { join } = require('path')
let base = fs.readFileSync(join(__dirname, '.arc-short')).toString()
let inv

test('Setup env', async t => {
  t.plan(1)
  inv = await inventory({ rawArc: base })
  t.ok(inv, 'Inventory loaded')
})

test('createLambdaJSON should return a CFN definition with correct config.arc function configuration overrides', t => {
  t.plan(1)
  mockFs({
    'src/lambda/one/config.arc': '@aws\nmemory 1337'
  })
  let result = json(inv, 'src/lambda/one')
  mockFs.restore()
  let defn = result[1]
  t.equals(defn.Properties.MemorySize, 1337, 'Correct memory override read')
})

test('createLambdaJSON should return a properly formatted name based on the basename of the provided path to the function', t => {
  t.plan(1)
  mockFs({
    'src/lambda/comb-the-desert/config.arc': '@aws\nmemory 1337'
  })
  let result = json(inv, 'src/lambda/comb-the-desert')
  mockFs.restore()
  let name = result[0]
  t.equals(name, 'CombTheDesertPluginLambda', 'Lambda name is PascalCase and ends with PluginLambda')
})

test('createLambdaJSON should return a CFN definition with proper path', t => {
  t.plan(1)
  mockFs({
    'src/lambda/beepboop/config.arc': '@aws\nmemory 1337'
  })
  let result = json(inv, 'src/lambda/beepboop')
  mockFs.restore()
  let defn = result[1]
  t.equals(defn.Properties.CodeUri, 'src/lambda/beepboop', 'Correct CodeUri set based on local path')
})
