let parse = require('@architect/parser')
let test = require('tape')
let deploy = require('../scripts/deploy')
let {toCFN} = require('../')

test('toCFN', t=> {
  t.plan(1)
  t.ok(toCFN, 'toCFN')
  console.log(toCFN)
})

test.only('toCFN(arc)', t=> {
  t.plan(1)
  let arcfile = `
@app
cheeky

@aws
bucket cf-sam-deployments-east

@http
get /
get /foo

@events
lol
sneeze

@tables
foo
  barID *String

cat
  catID *String
  bar **String

@indexes
foo
  bazID *String
  `
  let arc = parse(arcfile)
  deploy({arc, log:true, verbose:true}, function done(err, result) {
    if (err) t.fail(err)
    else {
      t.ok(true, 'got result')
      console.log(result)
    }
  })
})
