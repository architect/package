let test = require('tape')
let index = require('../../')
let parser = require('@architect/parser')
let sinon = require('sinon')
let fs = require('fs')
let path = require('path')
let shortArcFile = fs.readFileSync(path.join(__dirname, '.arc-short')).toString()
// let longArcFile = fs.readFileSync(path.join(__dirname, '.arc-long')).toString()

test('main module method: short arc file should invoke toSAM', t => {
  t.plan(1)
  let fake = sinon.fake.returns()
  sinon.replace(index, 'toSAM', fake)
  let arc = parser(shortArcFile)
  index(arc)
  t.ok(fake.calledOnce, 'toSAM called')
  sinon.restore()
})

/* FIXME need to revisit nesting strategy
test('main module method: long arc file should invoke toCFN', t => {
  t.plan(1)
  let fake = sinon.fake.returns()
  sinon.replace(index, 'toCFN', fake)
  let arc = parser(longArcFile)
  index(arc)
  t.ok(fake.calledOnce, 'toCFN called')
  sinon.restore()
})*/
