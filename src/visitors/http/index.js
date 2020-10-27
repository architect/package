let { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
let { join } = require('path')

let { getLambdaName, toLogicalID, fingerprint: fingerprinter } = require('@architect/utils')

let getApiProps = require('./get-api-properties')
let renderRoute = require('./render-route')

let { getLambdaEnv } = require('../utils')
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
    let { method, src, config } = route
    let { timeout, memory, runtime, handler, concurrency, layers, policies } = config

    let path = renderRoute(route.path) // From `/foo/:bar` to `/foo/{bar}`
    let lambdaName = getLambdaName(route.path)
    let name = toLogicalID(`${method}${lambdaName.replace(/000/g, '')}`) // GetIndex
    let env = getLambdaEnv(runtime, inventory)

    // Add Lambda resources
    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: handler,
        CodeUri: src,
        Runtime: runtime,
        MemorySize: memory,
        Timeout: timeout,
        Environment: { Variables: env },
        Role: {
          'Fn::Sub': [
            'arn:aws:iam::${AWS::AccountId}:role/${roleName}',
            { roleName: { Ref: 'Role' } }
          ]
        },
        Events: {}
      }
    }

    if (concurrency !== 'unthrottled') {
      template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
    }

    if (layers.length > 0) {
      template.Resources[name].Properties.Layers = layers
    }

    if (policies.length > 0) {
      template.Resources[name].Properties.Policies = policies
    }

    // Construct the API event source so SAM can wire the permissions
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
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
    template.Resources.GetCatchall.Properties.Runtime = 'nodejs12.x'


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
      template.Resources.GetCatchall.Properties.CodeUri = tmp
    }
    else {
      template.Resources.GetCatchall.Properties.CodeUri = arcProxy
    }

    // Add permissions for Arc Static Asset Proxy (ASAP) at GetCatchall
    template.Resources.InvokeArcStaticAssetProxy = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: { Ref: 'GetCatchall' },
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
