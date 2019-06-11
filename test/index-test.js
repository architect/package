//let fs = require('fs')
let test = require('tape')
let parse = require('@architect/parser')
let package = require('../')

let mockArcFile = `@app
cheeky
@tables
cats
  catID *String

@indexes
cats
  flufferID *String
  catID **String
`

test('@indexes', t=> {
  t.plan(1)
  let arc = parse(mockArcFile)
  let serverless = package(arc)
  console.log(JSON.stringify(serverless, null, 2))
  t.ok(true, 'pkg')
})

