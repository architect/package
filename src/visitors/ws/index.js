let { toLogicalID } = require('@architect/utils')
let { createLambda } = require('../utils')

/**
 * Visit arc.ws and merge in AWS::Serverless resources
 */
module.exports = function visitWebSockets (inventory, template) {
  let { inv } = inventory
  if (!inv.ws) return template

  let { deployStage } = inv._arc
  let Name = toLogicalID(`${inv.app}-websocket-${deployStage}`)

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
      'ConnectWSRoute',
      'DefaultWSRoute',
      'DisconnectWSRoute'
    ],
    Properties: {
      ApiId: { Ref: 'WS' },
    }
  }

  template.Resources.WebsocketStage = {
    Type: 'AWS::ApiGatewayV2::Stage',
    Properties: {
      StageName: deployStage,
      DeploymentId: { Ref: 'WebsocketDeployment' },
      ApiId: { Ref: 'WS' },
    }
  }

  // augment the lambdas role
  template.Resources.WebSocketPolicy = {
    Type: 'AWS::IAM::Policy',
    DependsOn: 'Role',
    Properties: {
      PolicyName: 'ArcWebSocketPolicy',
      PolicyDocument: {
        Statement: [ {
          Effect: 'Allow',
          Action: [
            'execute-api:Invoke',
            'execute-api:ManageConnections'
          ],
          Resource: [
            { 'Fn::Sub': [
              'arn:aws:execute-api:${AWS::Region}:*:${api}/*',
              { api: { Ref: 'WS' } }
            ] }
          ]
        } ]
      },
      Roles: [ { Ref: 'Role' } ]
    }
  }

  inv.ws.forEach(route => {
    let name = toLogicalID(route.name)
    let wsLambda = `${name}WSLambda`
    let wsRoute = `${name}WSRoute`
    let wsIntegration = `${name}WSIntegration`
    let wsPermission = `${name}WSPermission`

    // Create the Lambda
    template.Resources[wsLambda] = createLambda({
      lambda: route,
      inventory,
      template,
    })

    let defaults = [ 'default', 'connect', 'disconnect' ]
    template.Resources[wsRoute] = {
      Type: 'AWS::ApiGatewayV2::Route',
      Properties: {
        ApiId: { Ref: 'WS' },
        RouteKey: defaults.includes(route.name) ? `$${route.name}` : route.name,
        OperationName: wsRoute,
        Target: {
          'Fn::Join': [ '/', [ 'integrations', { Ref: wsIntegration } ] ]
        }
      }
    }

    template.Resources[wsIntegration] = {
      Type: 'AWS::ApiGatewayV2::Integration',
      Properties: {
        ApiId: { Ref: 'WS' },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: {
          'Fn::Sub': [
            'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${' + wsLambda + '.Arn}/invocations',
            {}
          ]
        }
      }
    }

    template.Resources[wsPermission] = {
      Type: 'AWS::Lambda::Permission',
      DependsOn: [ 'WS', wsLambda ],
      Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: { Ref: wsLambda },
        Principal: 'apigateway.amazonaws.com'
      }
    }
  })

  template.Outputs.WSS = {
    Description: 'WebSocket Endpoint',
    Value: {
      'Fn::Sub': [
        // Always default to staging; mutate to production via macro where necessary
        'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/' + deployStage,
        {}
      ]
    }
  }

  return template
}
