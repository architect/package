let {version} = require('../package.json')
let visitors = require('./visitors')

/**
 * returns AWS::Serverless JSON for a given (parsed) .arc file
 */
module.exports = function toServerlessCloudFormation(arc) {

  // allowed list of pragmas ['http', 'globals'...etc]
  let supports = Object.keys(visitors)

  // helper to filter an array to only supported pragmas
  let supported = pragma=> supports.includes(pragma)

  // list of pragmas defined in the arc file
  let httpFirst = (x, y)=> x == 'http'? -1 : y == 'http'? 1 : 0
  let pragmas = Object.keys(arc).filter(supported).sort(httpFirst)

  // walk the template invoking the vistor for the given pragma
  let visit = (template, pragma)=> visitors[pragma](arc, template)

  // force globals first
  pragmas.push('globals')

  // default cloudformation template
  // visitors will interpolate: Parameters, Mappings, Conditions, Resources, and Outputs
  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${new Date(Date.now()).toISOString()}`,
  }

  // walk pragmas to reduce final template contents
  return pragmas.reduce(visit, template)
}
