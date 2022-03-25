let getLambdaEnv = require('./get-lambda-env')

module.exports = function createLambda (params) {
  let { lambda, inventory, template } = params
  let { build, src, config } = lambda
  let { architecture, timeout, memory, runtime, storage, runtimeConfig, handler, concurrency, layers, policies } = config
  let Variables = getLambdaEnv({ config, inventory, lambda, runtime })
  let Runtime = runtimeConfig?.baseRuntime || runtime

  // Add Lambda resources
  let item = {
    Type: 'AWS::Serverless::Function',
    Properties: {
      Handler: handler,
      CodeUri: build || src,
      Runtime,
      Architectures: [ architecture ],
      MemorySize: memory,
      EphemeralStorage: { Size: storage },
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
    delete item.Properties.Role // Policies are ignored if Role is present

    // Allow opt-in to generated Architect policy statements
    let arcPolicies = 'architect-default-policies'
    if (policies.includes(arcPolicies)) {
      // Remove the opt-in
      item.Properties.Policies = policies.filter(p => p !== arcPolicies)
      let Statement = []
      template.Resources.Role.Properties.Policies.forEach(policy => {
        policy.PolicyDocument.Statement.forEach(p => Statement.push(p))
      })
      if (template.Resources.ParameterStorePolicy) {
        template.Resources.ParameterStorePolicy.Properties.PolicyDocument.Statement.forEach(p => Statement.push(p))
      }
      item.Properties.Policies.push({ Statement })
    }
  }

  return item
}
