let { getLambdaName, toLogicalID } = require('@architect/utils')
let renderRoute = require('./render-route')

module.exports = function getHttpApiProperties (inventory) {
  let { inv } = inventory
  let { http } = inv
  let payloadVersion = inv.aws.apigateway === 'httpv1' ? '1.0' : '2.0'

  let paths = getPaths(http, payloadVersion)
  let Properties = {
    StageName: '$default', // Default, but specify for safety
    DefinitionBody: {
      openapi: '3.0.1',
      info: { title: { Ref: 'AWS::StackName' } },
      paths,
    }
  }
  return Properties
}

function getPaths (routes, payloadFormatVersion) {
  let paths = {}

  routes.forEach(route => {
    let { method, path } = route
    // Special API Gateway OpenAPI impl for `any` method
    let m = method === 'any' ? 'x-amazon-apigateway-any-method' : method
    let cfPath = renderRoute(path)
    if (!paths[cfPath]) paths[cfPath] = {}
    if (!paths[cfPath][m]) {
      paths[cfPath][m] = {
        'x-amazon-apigateway-integration': {
          payloadFormatVersion,
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
  })

  return paths
}

// Example: 'get' + '/' -> GetIndex
let getName = ({ path, method }) => toLogicalID(`${method}${getLambdaName(path).replace(/000/g, '')}`)

function getURI (route) {
  let name = getName(route)
  let arn = `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${name}HTTPLambda.Arn}/invocations`
  return { 'Fn::Sub': arn }
}
