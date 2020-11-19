module.exports = function getEnv (params) {
  let { config, runtime, inventory } = params
  let { inv } = inventory

  let env = {
    ARC_APP_NAME: inv.app,
    ARC_CLOUDFORMATION: { Ref: 'AWS::StackName' },
    ARC_ENV: 'staging', // Always default to staging; mutate to production via macro where necessary
    ARC_HTTP: 'aws_proxy', // used for feature detection (could be 'aws' for vtl style)
    ARC_ROLE: { Ref: 'Role' },
    NODE_ENV: 'staging', // Same as above, always default to staging; userland may mutate
    SESSION_TABLE_NAME: 'jwe',
  }

  if (config.env === false) env.ARC_DISABLE_ENV_VARS = true

  // Global add PYTHONPATH if the runtime is Python
  if (runtime.startsWith('python')) {
    env.PYTHONPATH = '/var/task/vendor:/var/runtime:/opt/python'
  }

  // add the ARC_STATIC_BUCKET if defined
  if (inv.static) {
    env.ARC_STATIC_BUCKET = { Ref: 'StaticBucket' }
  }

  // add the ARC_WSS_URL if defined
  if (inv.ws) {
    env.ARC_WSS_URL = {
      'Fn::Sub': [
        // Always default to staging; mutate to production via macro where necessary
        'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/staging',
        {}
      ]
    }
  }

  return env
}
