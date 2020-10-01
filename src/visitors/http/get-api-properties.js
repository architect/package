let { getLambdaName, toLogicalID } = require('@architect/utils')
let renderRoute = require('./render-route')

module.exports = function getHttpApiProperties (http) {
  let { paths, InvokeDefaultPermission } = getPaths(http)
  let Properties = {
    StageName: '$default', // Default, but specify for safety
    DefinitionBody: {
      openapi: '3.0.1',
      info: { title: { Ref: 'AWS::StackName' } },
      paths,
    }
  }
  return { Properties, InvokeDefaultPermission }
}

function getPaths (routes) {
  let paths = {}
  let fallbackRoute = { method: 'get', path: '/' }
  let foundFallbackRoute = false

  routes.forEach(r => {
    let method = r[0].toLowerCase()
    let path = r[1]
    let cfPath = renderRoute(path)
    if (!paths[cfPath]) paths[cfPath] = {}

    if (!paths[cfPath][method]) {
      paths[cfPath][method] = {
        'x-amazon-apigateway-integration': {
          payloadFormatVersion: '2.0',
          type: 'aws_proxy',
          httpMethod: 'POST',
          uri: getURI({ path, method }),
          connectionType: 'INTERNET',
          // TODO currently ignored, reimplement when respected by HTTP APIs
          // cacheNamespace: xlr8r,
          // cacheKeyParameters: [
          //   'method.request.path.proxy'
          // ]
        }
      }
    }

    let isRootMethod = method === 'get' || method === 'any'
    let isRootPath = path === '/' || path === '/*'
    if (isRootMethod && isRootPath && !foundFallbackRoute) {
      fallbackRoute = { method, path }
      foundFallbackRoute = true  // First match wins, don't keep overwriting the fallbackRoute
    }
  })

  let { $default, InvokeDefaultPermission } = addFallback(fallbackRoute)

  paths['/$default'] = $default

  return { paths, InvokeDefaultPermission }
}

function getName ({ path, method }) {
  return toLogicalID(`${method}${getLambdaName(path).replace(/000/g, '')}`) // example: GetIndex
}

function getURI (route) {
  let name = getName(route)
  let arn = `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${name}.Arn}/invocations`
  return { 'Fn::Sub': arn }
}

function addFallback (fallbackRoute) {
  let $default = {
    'x-amazon-apigateway-any-method': {
      isDefaultRoute: true,
      'x-amazon-apigateway-integration': {
        payloadFormatVersion: '2.0',
        type: 'aws_proxy',
        httpMethod: 'POST',
        uri: getURI(fallbackRoute),
        connectionType: 'INTERNET',
        // TODO currently ignored, reimplement when respected by HTTP APIs
        // cacheNamespace: xlr8r,
        // cacheKeyParameters: [
        //   'method.request.path.proxy'
        // ]
      }
    }
  }

  let InvokeDefaultPermission = {
    Type: 'AWS::Lambda::Permission',
    Properties: {
      FunctionName: { Ref: getName(fallbackRoute) },
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      SourceArn: {
        'Fn::Sub': [
          'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*',
          { ApiId: { Ref: 'HTTP' } }
        ]
      }
    }
  }

  return { $default, InvokeDefaultPermission }
}
