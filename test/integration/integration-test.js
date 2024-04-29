let inventory = require('@architect/inventory')
let test = require('tape')
let child = require('child_process')
let { join } = require('path')
let fs = require('fs')
let pkg = require('../../')

/**
 * Heads up! Running this test from npm introduces some funkiness re cwd and other bits
 */

// run package
// run deploy
let rawArc = `
@app
test-pkg

@aws
runtime deno

@cdn
@static
@http
get /api
get /foo
`
// Replace as necessary during testing
let bucket = 'cf-sam-deployments-east'
let cwd = join(__dirname, 'mock')
process.chdir(cwd)

test('write sam.json', async t => {
  t.plan(1)
  let inv = await inventory({ rawArc })
  try {
    let sam = pkg(inv)
    let file = join(__dirname, 'mock', 'sam.json')
    fs.writeFileSync(file, JSON.stringify(sam, null, 2))
    t.pass('ran')
    console.log(sam)
  }
  catch (err) { t.fail(err) }
})

// helper function for child.spawn
function spawn (command, args, callback) {
  let pkg = child.spawn(command, args, { cwd, shell: true })
  pkg.stdout.on('data', b => console.log(b.toString()))
  pkg.stderr.on('data', function (b) {
    console.log(b.toString())
    callback(Error('stderr'))
  })
  pkg.on('close', () => callback())
  pkg.on('error', callback)
}

test('Transform SAM to CFN', t => {
  t.plan(1)
  spawn('aws', [
    'cloudformation',
    'package',
    '--template-file', `sam.json`,
    '--output-template-file', `sam.yaml`,
    '--s3-bucket', bucket,
  ],
  function done (err) {
    if (err) t.fail(err)
    else t.pass('packaged')
  })
})

test('Deploy', t => {
  t.plan(1)
  spawn('aws', [
    'cloudformation',
    'deploy',
    '--template-file', `sam.yaml`,
    '--stack-name', 'PackageTestApp1',
    '--s3-bucket', bucket,
    '--capabilities',
    'CAPABILITY_IAM CAPABILITY_AUTO_EXPAND',
  ],
  function done (err) {
    if (err) t.fail(err)
    else t.pass('deployed')
  })
})
