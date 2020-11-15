let { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
let { join } = require('path')

let { getLambdaName, toLogicalID, fingerprint: fingerprinter } = require('@architect/utils')

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
  let Properties = getApiProps(http)

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

  // If we added get index, we need to fix the code path
  if (inv._project.rootHandler === 'arcStaticAssetProxy') {
    // Package running as a dependency (most common use case)
    let arcProxy = join(process.cwd(), 'node_modules', '@architect', 'http-proxy', 'dist')
    // Package running as a global install
    let global = join(__dirname, '..', '..', '..', '..', 'http-proxy', 'dist')
    // Package running from a local (symlink) context (usually testing/dev)
    let local = join(__dirname, '..', '..', '..', 'node_modules', '@architect', 'http-proxy', 'dist')
    if (existsSync(global)) arcProxy = global
    else if (existsSync(local)) arcProxy = local

    // Set the runtime
    template.Resources.GetCatchallHTTPLambda.Properties.Runtime = 'nodejs12.x'


    let { fingerprint } = fingerprinter.config({ static: inv._project.arc.static })
    if (fingerprint) {
      // Note: Arc's tmp dir will need to be cleaned up by a later process further down the line
      let tmp = join(process.cwd(), '__ARC_TMP__')
      let shared = join(tmp, 'node_modules', '@architect', 'shared')
      mkdirSync(shared, { recursive: true })
      // Handle proxy
      let proxy = readFileSync(join(arcProxy, 'index.js'))
      writeFileSync(join(tmp, 'index.js'), proxy)
      // Handle static.json
      let staticFolder = inv.static.folder
      staticFolder = join(process.cwd(), staticFolder)
      let staticManifest = readFileSync(join(staticFolder, 'static.json'))
      writeFileSync(join(shared, 'static.json'), staticManifest)
      // Ok we done
      template.Resources.GetCatchallHTTPLambda.Properties.CodeUri = tmp
    }
    else {
      template.Resources.GetCatchallHTTPLambda.Properties.CodeUri = arcProxy
    }

    // Add permissions for Arc Static Asset Proxy (ASAP) at GetCatchallHTTPLambda
    template.Resources.InvokeArcStaticAssetProxy = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: { Ref: 'GetCatchallHTTPLambda' },
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
  }

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
