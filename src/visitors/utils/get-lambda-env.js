module.exports = function getEnv (params) {
  let { config, inventory, lambda, runtime } = params
  let { inv, get } = inventory
  let { deployStage } = inv._arc
  let { env: userEnv, rootHandler } = inv._project

  let env = {
    ARC_APP_NAME: inv.app,
    ARC_CLOUDFORMATION: { Ref: 'AWS::StackName' },
    ARC_ENV: deployStage,
    ARC_ROLE: { Ref: 'Role' },
    SESSION_TABLE_NAME: 'jwe',
  }

  // add the ARC_STATIC_BUCKET if defined
  if (inv.static) {
    env.ARC_STATIC_BUCKET = { Ref: 'StaticBucket' }
  }

  // add the ARC_WSS_URL if defined
  if (inv.ws) {
    env.ARC_WSS_URL = {
      'Fn::Sub': [
        'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/' + deployStage,
        {}
      ]
    }
  }

  // ASAP + SPA static app variables
  if (lambda.pragma === 'http' && rootHandler) {
    if (rootHandler === 'arcStaticAssetProxy' ||
        rootHandler === lambda.name) {
      let prefix = get.static('prefix')
      if (prefix) env.ARC_STATIC_PREFIX = prefix

      // SPA defaults to false if env var isn't set
      let spaSetting = get.static('spa')
      let hasSpa = typeof spaSetting !== undefined
      if (hasSpa) env.ARC_STATIC_SPA = spaSetting
    }
  }

  // Populate userland env vars if any are present and this Lambda has them enabled
  let envVars = userEnv?.aws?.[deployStage]
  if (envVars && config.env !== false) {
    Object.entries(envVars).forEach(([ k, v ]) => {
      if (!env[k]) env[k] = v
    })
  }
  if (config.env === true) {
    env.ARC_DISABLE_ENV_VARS = true
  }

  // Global add PYTHONPATH if the runtime is Python; do it down here to allow userland customization
  if (runtime.startsWith('python') && !env.PYTHONPATH) {
    env.PYTHONPATH = '/var/task/vendor:/var/runtime:/opt/python'
  }

  return env
}
