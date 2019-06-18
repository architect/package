//let fs = require('fs')
let test = require('tape')
let parse = require('@architect/parser')
let package = require('../')

let mockArcFile = `
@app
cheeky

@tables
accounts
  accountID *String

activity
  appID *String
  ts **String

apis
  apiID *String

apps
  appID *String

apps-accounts
  accountID *String
  appID **String

builds
  buildID *String

@indexes
accounts
  appID *String

accounts
  login *String

accounts
  username *String

activity
  accountID *String

activity
  event *String

apis
  name *String

apis
  region *String

apps
  accountID *String

apps
  name *String

apps
  repository *String

apps
  token *String

apps-accounts
  accountID *String

apps-accounts
  appID *String

builds
  appID_env *String
  ts **String
`

test('@indexes', t=> {
  t.plan(1)
  let arc = parse(mockArcFile)
  let serverless = package(arc)
  console.log(JSON.stringify(serverless, null, 2))
  t.ok(true, 'pkg')
})

