let getLambdaEnv = require('./get-lambda-env')

module.exports = function createLambda (params) {
  let { lambda, inventory } = params
  let { src, config } = lambda
  let { timeout, memory, runtime, handler, concurrency, layers, policies } = config
  let Variables = getLambdaEnv({ config, runtime, inventory })

  // Add Lambda resources
  let item = {
    Type: 'AWS::Serverless::Function',
    Properties: {
      Handler: handler,
      CodeUri: src,
      Runtime: runtime,
      MemorySize: memory,
      Timeout: timeout,
      Environment: { Variables },
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
    item.Properties.ReservedConcurrentExecutions = concurrency
  }

  if (layers.length > 0) {
    item.Properties.Layers = layers
  }

  if (policies.length > 0) {
    item.Properties.Policies = policies
  }

  return item
}
