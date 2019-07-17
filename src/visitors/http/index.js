let {join} = require('path')

let toLogicalID = require('@architect/utils/to-logical-id')

let getApiProps = require('./get-api-properties')
let unexpress = require('./un-express-route')

let getEnv = require('../get-lambda-env')
let getLambdaName = require('../get-lambda-name')
let getPropertyHelper = require('../get-lambda-config')

/**
 * visit arc.http and merge in AWS::Serverless resources
 */
module.exports = function http(arc, template) {

  let findGetIndex = tuple=> tuple[0].toLowerCase() === 'get' && tuple[1] === '/'
  let hasGetIndex = arc.http.some(findGetIndex) // we reuse this below for default proxy code

  // force add GetIndex
  if (!hasGetIndex) {
    arc.http.push(['get', '/'])
  }

  // base props
  let Type = 'AWS::Serverless::Api'
  let Properties = getApiProps(arc)
  let appname = toLogicalID(arc.app[0])

  // construct the runtime env
  let env = getEnv(arc)

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  // construct the api resource
  template.Resources[appname] = {Type, Properties}

  // walk the arc file http routes
  arc.http.forEach(route=> {

    let method = route[0].toLowerCase() // get, post, put, delete, patch
    let path = unexpress(route[1]) // from /foo/:bar to /foo/{bar}
    let name = toLogicalID(`${method}${getLambdaName(route[1]).replace(/000/g, '')}`) // GetIndex
    let code = `./src/http/${method}${getLambdaName(route[1])}` // ./src/http/get-index
    let prop = getPropertyHelper(arc, code) // returns a helper function for getting props

    // adding lambda resources
    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: 'index.handler',
        CodeUri: code,
        Runtime: prop('runtime'),
        MemorySize: prop('memory'),
        Timeout: prop('timeout'),
        Environment: {Variables: env},
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            {roleName: {'Ref': `Role`}}
          ]
        },
        Events: {}
      }
    }

    let concurrency = prop('concurrency')
    if (concurrency != 'unthrottled') {
      template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
    }

    let layers = prop('layers')
    if (Array.isArray(layers) && layers.length > 0) {
      template.Resources[name].Properties.Layers = layers
    }

    // construct the event source so SAM can wire the permissions
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'Api',
      Properties: {
        Path: path,
        Method: route[0].toUpperCase(),
        RestApiId: {'Ref': appname}
      }
    }
  })

  // if we added get index we need to fix the code path
  if (!hasGetIndex && arc.static) {
    // inline the default proxy
    let tmpl = join(__dirname, '..', '..', '..', 'vendor', 'arc-proxy-3.2.2', 'index.js')
    template.Resources.GetIndex.Properties.CodeUri = tmpl
  }

  // add permissions for proxy+ resource aiming at GetIndex
  template.Resources.InvokeProxyPermission = {
    Type: 'AWS::Lambda::Permission',
    Properties: {
      FunctionName: {Ref: 'GetIndex'},
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      SourceArn: {
        'Fn::Sub': [
          'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${restApiId}/*/*',
          {restApiId: {'Ref': appname}}
        ]
      }
    }
  }

  // add the deployment url to the output
  template.Outputs.API = {
    Description: 'API Gateway',
    Value: {
      'Fn::Sub': [
        'https://${restApiId}.execute-api.${AWS::Region}.amazonaws.com/production/',
        {restApiId: {Ref: appname}}
      ]
    }
  }

  template.Outputs.restApiId = {
    Description: 'HTTP restApiId',
    Value: {
      'Fn::Sub': [
        'https://${restApiId}.execute-api.${AWS::Region}.amazonaws.com/production/',
        {restApiId: {Ref: appname}}
      ]
    }
  }

  return template
}
