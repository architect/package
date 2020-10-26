let { version } = require('../package.json')
let visitors = require('./visitors')

/**
 * Architect Package
 * Generates and returns AWS::Serverless JSON for a given (parsed) .arc file
 *
 * @param {Object} arc - parsed arcfile
 * @returns {CloudFormation::Serverless} template
 */
module.exports = function toSAM (arc) {
  // allowed list of pragmas ['http', 'globals'...etc]
  let supports = Object.keys(visitors)

  // helper to filter an array to only supported pragmas
  let supported = pragma => supports.includes(pragma)

  // list of pragmas defined in the arc file
  let httpFirst = (x, y) => x == 'http' ? -1 : y == 'http' ? 1 : 0
  let pragmas = Object.keys(arc).filter(supported).sort(httpFirst)

  // walk the template invoking the visitor for the given pragma
  let visit = (template, pragma) => visitors[pragma](arc, template)

  // force globals first (last?)
  pragmas.push('globals')
  pragmas.push('deno')

  // default cloudformation template
  // visitors will interpolate: Parameters, Mappings, Conditions, Resources, and Outputs
  let timestamp = new Date(Date.now()).toISOString()
  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${timestamp}`,
  }

  // walk pragmas to reduce final template contents
  return pragmas.reduce(visit, template)
}
