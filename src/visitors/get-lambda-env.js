//let parse = require('@architect/parser')
//let fs = require('fs')
//let path = require('path')

module.exports = function getEnv(arc/*, pathToCode*/) {

  let env = {
    ARC_ROLE: {Ref: 'Role'},
    ARC_CLOUDFORMATION: {Ref: 'AWS::StackName'},
    ARC_APP_NAME: arc.app[0],
    ARC_HTTP: 'aws_proxy', // used for feature detection (could be 'aws' for vtl style)
    NODE_ENV: 'staging', // Always default to staging; mutate to production via macro where necessary
    SESSION_TABLE_NAME: 'jwe',
  }

  // global add PYTHONPATH if the runtime is python
  let python = v=> Array.isArray(v) && v[0] === 'runtime' && v[1].startsWith('py')
  if (arc.aws && arc.aws.some(python)) {
    env.PYTHONPATH = '/var/task/vendor:/var/runtime:/opt/python'
  }

  // add the ARC_STATIC_BUCKET if defined
  if (arc.static) {
    env.ARC_STATIC_BUCKET = {Ref: 'StaticBucket'}
  }

  // add the ARC_WSS_URL if defined
  if (arc.ws) {
    env.ARC_WSS_URL = {
      'Fn::Sub': [
        // Always default to staging; mutate to production via macro where necessary
        'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/staging',
        {}
      ]
    }
  }

  /* FIXME move to deploy macro .arc-config local override
  let arcFile = path.join(pathToCode, '.arc-config')
  let exists = fs.existsSync(arcFile)
  if (exists) {
    let raw = fs.readFileSync(arcFile).toString().trim()
    let config = parse(raw)
    if (config.aws && config.aws.some(python)) {
      // local add PYTHONPATH if the runtime is python
      env.PYTHONPATH = '/var/task/vendor:/var/runtime:/opt/python'
    }
  }*/

  return env
}
