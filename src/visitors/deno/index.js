/**
 * support for Deno custom runtime
 */
module.exports = function visitDeno (inventory, template) {

  // Walk the functions and add custom runtime if 'deno' specified
  let hasDeno = false
  let resources = Object.keys(template.Resources)
  for (let resource of resources) {
    let isFunction = template.Resources[resource].Type === 'AWS::Serverless::Function'
    let isDeno =  template.Resources[resource].Properties.Runtime === 'deno'
    if (isFunction && isDeno) {
      // Use this later
      hasDeno = true
      // If this does not exist create it
      if (!template.Resources[resource].Properties.Layers) {
        template.Resources[resource].Properties.Layers = []
      }
      template.Resources[resource].Properties.Layers.push({ 'Fn::GetAtt': [ 'Deno', 'Outputs.DenoRuntimeArn' ] })
      template.Resources[resource].Properties.Handler = 'index.handler'
      template.Resources[resource].Properties.Runtime = 'provided'
    }
  }

  // Add the Deno custom runtime layer
  if (hasDeno) {
    template.Resources.Deno = {
      Type: 'AWS::Serverless::Application',
      Properties: {
        Location: {
          ApplicationId: 'arn:aws:serverlessrepo:us-east-1:455488262213:applications/Deno',
          SemanticVersion: '0.26.0'
        }
      }
    }
  }

  return template
}
