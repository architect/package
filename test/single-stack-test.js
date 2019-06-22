let parse = require('@architect/parser')
let child = require('child_process')
let fs = require('fs')
let path = require('path')
let test = require('tape')
let toSAM = require('../').toSAM

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

test('arc package', t=> {
  t.plan(2)
  let mockPath = path.join(__dirname, 'mock', '.arc')
  let mockDest = path.join(__dirname, 'mock', 'sam.json')
  let raw = fs.readFileSync(mockPath).toString()
  let arc = parse(raw)
  let sam = toSAM(arc)
  t.ok(arc, '.arc')
  t.ok(sam, 'sam.json')
  fs.writeFileSync(mockDest, JSON.stringify(sam, null, 2))
  console.log(sam)
})

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
