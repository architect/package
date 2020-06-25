let { toLogicalID } = require('@architect/utils')

let getLambdaName = require('../get-lambda-name')
let unexpress = require('./un-express-route')

module.exports = function getApiProperties (arc) {
  return {
    StageName: 'staging',
    DefinitionBody: getOpenApi(arc),
    EndpointConfiguration: 'REGIONAL',
    BinaryMediaTypes: [ '*~1*' ], // wat
    MinimumCompressionSize: 0,
  }
}

function getOpenApi (arc) {
  return {
    openapi: '3.0.1',
    info: {
      title: { Ref: 'AWS::StackName' }
      // arc.app[0],
    },
    paths: getPaths(arc.http)
  }
}

function getPaths (routes) {

  let result = {}

  routes.forEach(route => {

    let method = route[0]
    let path = unexpress(route[1])

    if (!result[path])
      result[path] = {}

    if (!result[path][method]) {
      result[path][method] = {
        responses: {
          '200': {
            description: '200 response',
          }
        },
        'x-amazon-apigateway-integration': {
          uri: getURI({ path: route[1], method }),
          responses: {
            default: {
              statusCode: '200', // lol
              contentHandling: 'CONVERT_TO_TEXT',
            }
          },
          passthroughBehavior: 'when_no_match',
          httpMethod: 'POST',
          contentHandling: 'CONVERT_TO_TEXT',
          type: 'aws_proxy' // 'aws'
        }
      }
    }
  })
  return addFallback(result)
}

function getURI ({ path, method }) {
  let m = method.toLowerCase()
  let name = toLogicalID(`${m}${getLambdaName(path).replace(/000/g, '')}`) // GetIndex
  // let name = toLogicalID(getLambdaName(`${method.toLowerCase()}${path}`))
  let arn = `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${name}.Arn}/invocations`
  return { 'Fn::Sub': arn }
}

function addFallback (cf) {
  cf['/{proxy+}'] = {
    'x-amazon-apigateway-any-method': {
      parameters: [ {
        name: 'proxy',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        }
      } ],
      'x-amazon-apigateway-integration': {
        uri: getURI({ path: '/', method: 'GET' }),
        responses: {
          default: {
            statusCode: '200'
          }
        },
        passthroughBehavior: 'when_no_match',
        httpMethod: 'POST',
        cacheNamespace: 'xlr8r',
        cacheKeyParameters: [
          'method.request.path.proxy'
        ],
        contentHandling: 'CONVERT_TO_TEXT',
        type: 'aws_proxy'
      }
    }
  }
  return cf
}
