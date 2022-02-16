let { createLambda } = require('../utils')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit set.customLambdas plugins and merge in AWS::Serverless resources
 */
module.exports = function visitCustomLambdas (inventory, template) {
  let { inv } = inventory
  if (!inv.customLambdas) return template

  inv.customLambdas.forEach(lambda => {
    let name = toLogicalID(lambda.name)
    let customLambda = `${name}CustomLambda`

    // Create the Lambda
    template.Resources[customLambda] = createLambda({
      lambda,
      inventory,
      template,
    })
  })

  return template
}
