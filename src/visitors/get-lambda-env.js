module.exports = function getEnv(arc) {
  let env = {
    ARC_ROLE: {Ref: 'Role'},
    ARC_CLOUDFORMATION: {Ref: 'AWS::StackName'},
    ARC_APP_NAME: arc.app[0],
    ARC_HTTP: 'aws_proxy', // used for feature detection (could be 'aws' for vtl style)
    NODE_ENV: 'staging', // Always default to staging; mutate to production via macro where necessary
    SESSION_TABLE_NAME: 'jwe',
    PYTHONPATH: '/var/task/vendor:/var/runtime:/opt/python'
  }
  if (arc.static) {
    env.ARC_STATIC_BUCKET = {Ref: 'StaticBucket'}
  }
  return env
}
