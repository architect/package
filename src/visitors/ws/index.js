let toLogicalID = require('@architect/utils/to-logical-id')
let getPropertyHelper = require('../get-lambda-config')
let getEnv = require('../get-lambda-env')

/**
 * visit arc.ws and merge in AWS::Serverless resources
 */
module.exports = function visitWS(arc, template) {

  // ensure cf standard sections exist
  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  let appname = arc.app[0]
  let Name = toLogicalID(`${appname}-websocket`)

  template.Resources.WS = {
    Type: 'AWS::ApiGatewayV2::Api',
    Properties: {
      Name,
      ProtocolType: 'WEBSOCKET',
      RouteSelectionExpression: '$request.body.message'
    }
  }

  template.Resources.WebsocketDeployment = {
    Type: 'AWS::ApiGatewayV2::Deployment',
    DependsOn: [
      'WebsocketConnectRoute',
      'WebsocketDefaultRoute',
      'WebsocketDisconnectRoute'
    ],
    Properties: {
      ApiId: {Ref: 'WS'},
    }
  }

  template.Resources.WebsocketStage = {
    Type: 'AWS::ApiGatewayV2::Stage',
    Properties: {
      StageName: 'production',
      DeploymentId: {Ref: 'WebsocketDeployment'},
      ApiId: {Ref: 'WS'},
    }
  }

  // add websocket functions
  ;['default', 'connect', 'disconnect'].forEach(lambda=> {

    let name = toLogicalID(`websocket-${lambda}`)
    let code = `./src/ws/ws-${lambda}`
    let prop = getPropertyHelper(arc, code) // helper function for getting props
    let env = getEnv(arc)

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

    let Route = `${name}Route`
    let Integration = `${name}Integration`
    let Permission = `${name}Permission`

    template.Resources[Route] = {
      Type: 'AWS::ApiGatewayV2::Route',
      Properties: {
        ApiId: {Ref: 'WS'},
        RouteKey: `$${lambda}`,
        OperationName: Route,
        //AutorizationType: 'NONE',
        Target: {
          'Fn::Join': ['/', ['integrations', {Ref: Integration}]]
        }
      }
    }

    template.Resources[Integration] = {
      Type: 'AWS::ApiGatewayV2::Integration',
      Properties: {
        ApiId: {Ref: 'WS'},
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::Sub': [
            'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${'+name+'.Arn}/invocations',
            {}
          ]
        }
      }
    }

    template.Resources[Permission] = {
      Type: 'AWS::Lambda::Permission',
      DependsOn: ['WS', name],
      Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: {Ref: name},
        Principal: 'apigateway.amazonaws.com'
      }
    }
  })

  return template
}
