let { getLambdaName, toLogicalID } = require('@architect/utils')

let getApiProps = require('./get-api-properties')
let renderRoute = require('./render-route')

let { createLambda } = require('../utils')
let forceStatic = require('../static')
let proxy = require('./proxy')

/**
 * Visit arc.http and generate an HTTP API
 */
module.exports = function visitHttp (inventory, template) {
  let { inv } = inventory
  let { http } = inv
  if (!http) return template

  // Base props
  let Type = 'AWS::Serverless::HttpApi'
  let Properties = getApiProps(inventory)

  // Construct the API resource
  template.Resources.HTTP = { Type, Properties }

  // Walk the HTTP routes
  http.forEach(route => {
    let { method } = route

    let path = renderRoute(route.path) // From `/foo/:bar` to `/foo/{bar}`
    let lambdaName = getLambdaName(route.path)
    let name = toLogicalID(`${method}${lambdaName.replace(/000/g, '')}`) // GetIndex
    let routeLambda = `${name}HTTPLambda`
    let routeEvent = `${name}HTTPEvent`

    // Create the Lambda
    template.Resources[routeLambda] = createLambda({
      lambda: route,
      inventory,
      template,
    })

    // Construct the API event source so SAM can wire the permissions
    template.Resources[routeLambda].Properties.Events[routeEvent] = {
      Type: 'HttpApi',
      Properties: {
        Path: path,
        Method: method.toUpperCase(),
        ApiId: { Ref: 'HTTP' }
      }
    }
  })

  // add the deployment url to the output
  template.Outputs.API = {
    Description: 'API Gateway (HTTP)',
    Value: {
      'Fn::Sub': [
        // Always default to staging; mutate to production via macro where necessary
        'https://${ApiId}.execute-api.${AWS::Region}.amazonaws.com',
        { ApiId: { Ref: 'HTTP' } }
      ]
    }
  }

  template.Outputs.ApiId = {
    Description: 'API ID (ApiId)',
    Value: { Ref: 'HTTP' }
  }

  // Backfill @static
  if (!inv.static) {
    template = forceStatic(inventory, template)
  }

  // Handle @proxy (not to be confused with ASAP)
  if (inv.proxy) {
    template = proxy(inventory, template)
  }

  return template
}
