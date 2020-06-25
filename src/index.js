let { version } = require('../package.json')
let visitors = require('./visitors')
let nested = require('./nested')
let count = require('./resource-count')

/**
 * returns AWS::Serverless JSON for a given (parsed) .arc file
 */
module.exports = function toServerlessCloudFormation (arc) {
  // if its greater than 100 resources
  // create template files for nested stacks
  // otherwise just create a single sam template
  let exec = count(arc) > 200 ? module.exports.toCFN : module.exports.toSAM
  return exec(arc)
}

// alias out direct methods
module.exports.toCFN = toCFN
module.exports.toSAM = toSAM

/**
 * @param {Object} arc - parsed arcfile
 * @returns {Object} templates - nested template files for packaging/deployment
 */
function toCFN (arc) {

  let hasStream = tbl => tbl[Object.keys(tbl)[0]].stream
  let appname = arc.app[0]
  let template = {}

  template[`${appname}-cfn.json`] = nested.base(arc)

  if (arc.http)
    template[`${appname}-cfn-http.json`] = nested.http(arc)

  if (arc.events)
    template[`${appname}-cfn-events.json`] = nested.events(arc)

  if (arc.scheduled)
    template[`${appname}-cfn-scheduled.json`] = nested.scheduled(arc)

  if (arc.queues)
    template[`${appname}-cfn-queues.json`] = nested.queues(arc)

  if (arc.tables && arc.tables.some(hasStream))
    template[`${appname}-cfn-tables.json`] = nested.tables(arc)

  return template
}

/**
 * @param {Object} arc - parsed arcfile
 * @returns {CloudFormation::Serverless} template
 */
function toSAM (arc) {

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
