let test = require('tape')
let getPropertyHelper = require('../../../src/visitors/get-lambda-config')
let path = require('path')

test('get-lambda-config: should return layers info for multiple layers', t => {
    t.plan(4)
    const prop = getPropertyHelper({}, path.join(__dirname, '../', 'func1'));
    const layers = prop("layers")
    
    t.equal(Array.isArray(layers), true, 'layers is array')
    t.equal(true, layers.length == 2, 'there should be 2 layers');//'test:function:1', config.layers)
    t.equal('test:function:1', layers[0], 'layer.0 is test:function:1');
    t.equal('test:function:2', layers[1], 'layer.1 is test:function:2');
})

test('get-lambda-config: should return layers info for single layer', t => {
    t.plan(2)
    const prop = getPropertyHelper({}, path.join(__dirname, '../', 'func2'));
    const layers = prop("layers")
    
    t.equal(typeof layers == 'string', true, 'layers is string')
    t.equal('test:function:1', layers, 'layer == test:function:1');
})

