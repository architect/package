let test = require('tape')
let package = require('../')

test('package', t=> {
  t.plan(2)
  t.ok(package, 'package exists')
  t.ok(typeof package === 'function', 'is a function')
  console.log(package)
})
