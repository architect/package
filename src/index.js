let { version } = require('../package.json')
let visitors = require('./visitors')

/**
 * Architect Package
 * Generates and returns AWS::Serverless JSON for a given (parsed) .arc file
 *
 * @param {Object} arc - parsed arcfile
 * @returns {CloudFormation::Serverless} CloudFormation template
 */
module.exports = function package (inventory) {
  let { inv } = inventory
  if (!inv._arc.deployStage) {
    throw ReferenceError('@architect/package can only be used with a valid deploy stage set')
  }

  // allowed list of pragmas ['http', 'globals'...etc]
  let supports = Object.keys(visitors)

  // helper to filter an array to only supported pragmas
  let supported = pragma => supports.includes(pragma)

  // List of pragmas defined in the arc file
  let order = (x, y) => {
    // HTTP first, then tables
    if (x == 'http') return -1
    if (x == 'tables' && y !== 'http') return -1
    if (y == 'http' || y == 'tables') return 1
  }
  let pragmas = Object.keys(inv).filter(supported).sort(order)
  pragmas.push('deno')

  // Walk the CloudFormation template invoking the visitor for each given pragma
  let visit = (template, pragma) => visitors[pragma](inventory, template)

  // Force globals first for policies
  pragmas.unshift('globals')

  // default cloudformation template
  // visitors will interpolate: Parameters, Mappings, Conditions, Resources, and Outputs
  let timestamp = new Date(Date.now()).toISOString()
  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${timestamp}`,
    Resources: {},
    Outputs: {},
  }

  // walk pragmas to reduce final template contents
  return pragmas.reduce(visit, template)
}
