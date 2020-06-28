let { getLambdaName, toLogicalID } = require('@architect/utils')
let unexpress = require('./un-express-route')

module.exports = function getHttpApiProperties (http) {
  return {
    StageName: '$default', // Default, but specify for safety
    DefinitionBody: getOpenApi(http)
  }
}

function getOpenApi (http) {
  return {
    openapi: '3.0.1',
    info: {
      title: { Ref: 'AWS::StackName' }
    },
    paths: getPaths(http)
  }
}

function getPaths (routes) {
  let result = {}

  routes.forEach(route => {

    let method = route[0]
    let path = unexpress(route[1])
    if (!result[path]) result[path] = {}

    if (!result[path][method]) {
      result[path][method] = {
        'x-amazon-apigateway-integration': {
          payloadFormatVersion: '2.0',
          type: 'aws_proxy',
          httpMethod: 'POST',
          uri: getURI({ path: route[1], method }),
          connectionType: 'INTERNET',
          // TODO currently ignored, reimplement when respected by HTTP APIs
          // cacheNamespace: xlr8r,
          // cacheKeyParameters: [
          //   'method.request.path.proxy'
          // ]
        }
      }
    }
  })
  return addFallback(result)
}

function getURI ({ path, method }) {
  let m = method.toLowerCase()
  let name = toLogicalID(`${m}${getLambdaName(path).replace(/000/g, '')}`) // GetIndex
  let arn = `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${name}.Arn}/invocations`
  return { 'Fn::Sub': arn }
}

function addFallback (cf) {
  cf['/$default'] = {
    'x-amazon-apigateway-any-method': {
      isDefaultRoute: true,
      'x-amazon-apigateway-integration': {
        payloadFormatVersion: '2.0',
        type: 'aws_proxy',
        httpMethod: 'POST',
        uri: getURI({ path: '/', method: 'GET' }),
        connectionType: 'INTERNET',
        // TODO currently ignored, reimplement when respected by HTTP APIs
        // cacheNamespace: xlr8r,
        // cacheKeyParameters: [
        //   'method.request.path.proxy'
        // ]
      }
    }
  }
  return cf
}
