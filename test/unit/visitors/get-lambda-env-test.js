let test = require('tape')
let getEnv = require('../../../src/visitors/get-lambda-env')
let parser = require('@architect/parser')
// let sinon = require('sinon')
let fs = require('fs')
let path = require('path')
let shortArcFile = fs.readFileSync(path.join(__dirname, '..', '.arc-short')).toString()
const ARC = parser(shortArcFile)

test('get-lambda-env: baseline template interpolation', t => {
  t.plan(1)
  let result = getEnv(ARC, './fake')
  t.equals(result.ARC_APP_NAME, ARC.app[0], 'ARC_APP_NAME set to app name from arc file')
})

test('get-lambda-env: if static exists, sets ARC_STATIC_BUCKET', t => {
  t.plan(1)
  let arc = Object.assign({}, ARC)
  arc.static = [ true ]
  let result = getEnv(arc, './fake')
  t.deepEquals(result.ARC_STATIC_BUCKET, { Ref: 'StaticBucket' }, 'ARC_STATIC_BUCKET set')
})

