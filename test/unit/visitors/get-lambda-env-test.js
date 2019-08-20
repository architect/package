let test = require('tape')
let getEnv = require('../../../src/visitors/get-lambda-env')
let parser = require('@architect/parser')
let sinon = require('sinon')
let fs = require('fs')
let path = require('path')
let shortArcFile = fs.readFileSync(path.join(__dirname, '..', '.arc-short')).toString()
const ARC = parser(shortArcFile)

test('get-lambda-env: baseline template interpolation', t => {
  t.plan(1)
  let result = getEnv(ARC)
  t.equals(result.ARC_APP_NAME, ARC.app[0], 'ARC_APP_NAME set to app name from arc file')
})

test('get-lambda-env: if static exists, sets ARC_STATIC_BUCKET', t => {
  t.plan(1)
  let arc = Object.assign({}, ARC)
  arc.static = [true]
  let result = getEnv(arc)
  t.deepEquals(result.ARC_STATIC_BUCKET, {Ref: 'StaticBucket'}, 'ARC_STATIC_BUCKET set')
})

test('get-lambda-env: if .arc-env file exists, subsumes environment variables present therein', t => {
  t.plan(2)
  let existsStub = sinon.stub(fs, 'existsSync').returns(true)
  let readStub = sinon.stub(fs, 'readFileSync').returns({
    toString() {return {
      trim() { return `@testing
GLOBAL asdfasdf

@staging
GLOBAL_KEY val`}
    }}
  })
  let result = getEnv(ARC)
  t.deepEquals(result.testing, [['GLOBAL', 'asdfasdf']], 'testing env var present')
  t.deepEquals(result.staging, [['GLOBAL_KEY', 'val']], 'staging env var present')
  existsStub.restore()
  readStub.restore()
})

test('get-lambda-env: if .arc-env file exists, subsumes production environment variables present therein', t => {
  t.plan(2)
  let existsStub = sinon.stub(fs, 'existsSync').returns(true)
  let readStub = sinon.stub(fs, 'readFileSync').returns({
    toString() {return {
      trim() { return `@production
API_KEY 1234
DB_PASSWORD 12345`}
    }}
  })
  let result = getEnv(ARC)
  t.equals(result.API_KEY, 1234, 'first production env var set correctly')
  t.equals(result.DB_PASSWORD, 12345, 'second production env var set correctly')
  existsStub.restore()
  readStub.restore()
})
