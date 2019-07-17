let parse = require('@architect/parser')
let test = require('tape')
let child = require('child_process')
let path = require('path')
let fs = require('fs')
let pkg = require('../../')

// run package
// run deploy
let arcfile = `
@app
test-pkg

@static
@http
# get /
get /api
`

test('write sam.json', t=> {
  t.plan(1)
  let sam = pkg.toSAM(parse(arcfile))
  fs.writeFileSync(__dirname + '/mock/sam.json', JSON.stringify(sam, null, 2))
  t.ok(true, 'ran')
  console.log(sam)
})

// helper function for child.spawn
function spawn(command, args, callback) {
  let cwd = path.join(__dirname, 'mock')
  let pkg = child.spawn(command, args, {cwd, shell: true})
  pkg.stdout.on('data', b=> console.log(b.toString()))
  pkg.stderr.on('data', function(b) {
    console.log(b.toString())
    callback(Error('stderr'))
  })
  pkg.on('close', ()=> callback())
  pkg.on('error', callback)
}

test('sam package', t=> {
  t.plan(1)
  spawn('sam', [
    'package',
    '--template-file',
    `sam.json`,
    '--output-template-file',
    `sam.yaml`,
    '--s3-bucket',
    'cf-sam-deployments-east',
  ],
  function done(err) {
    if (err) t.fail(err)
    else {
      t.ok(true, 'packaged')
    }
  })
})

test('deploy', t=> {
  t.plan(1)
  spawn('sam', [
    'deploy',
    '--template-file',
    `sam.yaml`,
    '--stack-name',
    'PackageTestApp',
    '--s3-bucket',
    'cf-sam-deployments-east',
    '--capabilities',
    'CAPABILITY_IAM'
  ],
  function done(err) {
    if (err) t.fail(err)
    else {
      t.ok(true, 'deployed')
    }
  })
})
