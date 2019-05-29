let fs = require('fs')
let test = require('tape')
let parse = require('@architect/parser')
let package = require('../')

let mockArcFile = `@app
cheeky
@static
@http
get /
get /foo/:bar
`

test('package', t=> {
  t.plan(6)
  let arc = parse(mockArcFile)
  let serverless = package(arc)
  t.ok(serverless, 'successfully exported')
  t.ok(serverless.AWSTemplateFormatVersion && serverless.AWSTemplateFormatVersion === '2010-09-09', 'AWSTemplateFormatVersion')
  t.ok(serverless.Transform && serverless.Transform === 'AWS::Serverless-2016-10-31', 'AWS::Serverless')
  t.ok(serverless.Resources && Object.keys(serverless.Resources).length === 5, 'has 5 resources')
  console.log(Object.keys(serverless.Resources))

  let hasProdUrl = serverless.Outputs && serverless.Outputs.ProductionURL
  t.ok(hasProdUrl, 'has production url')
  if (hasProdUrl)
    console.log(serverless.Outputs.ProductionURL)

  let hasBucketUrl = serverless.Outputs && serverless.Outputs.BucketURL
  t.ok(hasBucketUrl, 'has bucket url')
  if (hasBucketUrl)
    console.log(serverless.Outputs.BucketURL)
})
