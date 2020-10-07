let { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
let { join } = require('path')

let { getLambdaName, toLogicalID, fingerprint: fingerprinter } = require('@architect/utils')

let getApiProps = require('./get-api-properties')
let renderRoute = require('./render-route')

let getEnv = require('../get-lambda-env')
let getPropertyHelper = require('../get-lambda-config')
let forceStatic = require('../static')
let proxy = require('./proxy')

/**
 * Visit arc.http and generate an HTTP API
 */
module.exports = function visitHttp (arc, template) {

  // Copy arc.http to avoid get index mutation
  let http = JSON.parse(JSON.stringify(arc.http))

  // Set up Arc Static Asset Proxy (ASAP): force add GetIndex if not defined
  let findRoot = r => {
    let method = r[0].toLowerCase()
    let path = r[1]
    let isRootMethod = method === 'get' || method === 'any'
    let isRootPath = path === '/' || path === '/*'
    return isRootMethod && isRootPath
  }
  let hasRoot = http.some(findRoot) // We reuse this below for ASAP
  // Only add ASAP if @proxy isn't defined
  let addASAP = !hasRoot && !arc.proxy
  if (addASAP) {
    http.push([ 'get', '/*' ])
  }

  // Base props
  let Type = 'AWS::Serverless::HttpApi'
  let Properties = getApiProps(http)

  // Ensure standard CF sections exist
  if (!template.Resources) template.Resources = {}
  if (!template.Outputs) template.Outputs = {}

  // Construct the API resource
  template.Resources.HTTP = { Type, Properties }

  // Walk the HTTP routes
  http.forEach(route => {

    let method = route[0].toLowerCase() // get, post, put, delete, patch
    let path = renderRoute(route[1]) // From `/foo/:bar` to `/foo/{bar}`
    let lambdaName = getLambdaName(route[1])
    let name = toLogicalID(`${method}${lambdaName.replace(/000/g, '')}`) // GetIndex
    let code = `./src/http/${method}${lambdaName}` // ./src/http/get-index
    let prop = getPropertyHelper(http, code) // Returns a helper function for getting props
    let env = getEnv(arc, code) // Construct the runtime env

    // Add Lambda resources
    template.Resources[name] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: 'index.handler',
        CodeUri: code,
        Runtime: prop('runtime'),
        MemorySize: prop('memory'),
        Timeout: prop('timeout'),
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

    let concurrency = prop('concurrency')
    if (concurrency !== 'unthrottled') {
      template.Resources[name].Properties.ReservedConcurrentExecutions = concurrency
    }

    let layers = prop('layers')
    if (Array.isArray(layers) && layers.length > 0) {
      template.Resources[name].Properties.Layers = layers
    }

    let policies = prop('policies')
    if (Array.isArray(policies) && policies.length > 0) {
      template.Resources[name].Properties.Policies = policies
    }

    // Construct the API event source so SAM can wire the permissions
    let eventName = `${name}Event`
    template.Resources[name].Properties.Events[eventName] = {
      Type: 'HttpApi',
      Properties: {
        Path: path,
        Method: route[0].toUpperCase(),
        ApiId: { Ref: 'HTTP' }
      }
    }
  })

  // If we added get index, we need to fix the code path
  if (addASAP) {
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

    let { fingerprint } = fingerprinter.config({ static: arc.static })
    if (fingerprint) {
      // Note: Arc's tmp dir will need to be cleaned up by a later process further down the line
      let tmp = join(process.cwd(), '__ARC_TMP__')
      let shared = join(tmp, 'node_modules', '@architect', 'shared')
      mkdirSync(shared, { recursive: true })
      // Handle proxy
      let proxy = readFileSync(join(arcProxy, 'index.js'))
      writeFileSync(join(tmp, 'index.js'), proxy)
      // Handle static.json
      let folderSetting = tuple => tuple[0] === 'folder'
      let staticFolder = arc.static && arc.static.some(folderSetting) ? arc.static.find(folderSetting)[1] : 'public'
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
  if (!arc.static) {
    template = forceStatic(arc, template)
  }

  // Handle @proxy (not to be confused with ASAP)
  if (arc.proxy) {
    template = proxy(arc, template)
  }

  return template
}
