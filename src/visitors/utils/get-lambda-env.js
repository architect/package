module.exports = function getEnv (runtime, { inv }) {

  let env = {
    ARC_ROLE: { Ref: 'Role' },
    ARC_CLOUDFORMATION: { Ref: 'AWS::StackName' },
    ARC_APP_NAME: inv.app,
    ARC_HTTP: 'aws_proxy', // used for feature detection (could be 'aws' for vtl style)
    NODE_ENV: 'staging', // Always default to staging; mutate to production via macro where necessary
    SESSION_TABLE_NAME: 'jwe',
  }

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
