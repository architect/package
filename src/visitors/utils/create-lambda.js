let getLambdaEnv = require('./get-lambda-env')

module.exports = function createLambda (params) {
  let { lambda, name, template, inventory } = params

  let { src, config } = lambda
  let { timeout, memory, runtime, handler, concurrency, layers, policies } = config
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
}
