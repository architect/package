/**
 * support for PHP custom runtime
 */
 module.exports = function visitPhp (inventory, template) {

    // Walk the functions and add custom runtime if 'php' specified
    let hasPhp = false
    let resources = Object.keys(template.Resources)
    for (let resource of resources) {
      let isFunction = template.Resources[resource].Type === 'AWS::Serverless::Function'
      let isPhp =  template.Resources[resource].Properties.Runtime === 'php'
      if (isFunction && isPhp) {
        // Use this later
        hasPhp = true
        // If this does not exist create it
        if (!template.Resources[resource].Properties.Layers) {
          template.Resources[resource].Properties.Layers = []
        }
        template.Resources[resource].Properties.Layers.push({ 'Fn::GetAtt': [ 'PHP', 'Outputs.PhpRuntimeArn' ] })
        template.Resources[resource].Properties.Handler = 'index.handler'
        template.Resources[resource].Properties.Runtime = 'provided'
      }
    }
  
    // Add the PHP custom runtime layer
    if (hasPhp) {
      template.Resources.PHP = {
        Type: 'AWS::Serverless::Application',
        Properties: {
          Location: {
            ApplicationId: 'arn:aws:serverlessrepo:us-east-1:455488262213:applications/arc-php',
            SemanticVersion: '0.1.0'
          }
        }
      }
    }
  
    return template
  }
  