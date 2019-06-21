let {version} = require('../package.json')
let visitors = require('./visitors')
let nested = require('./nested')
let count = require('./resource-count')

/**
 * returns AWS::Serverless JSON for a given (parsed) .arc file
 */
module.exports = toServerlessCloudFormation

// if its greater than 100 resources
// create template files for nested stacks
// otherwise just create a single sam template
function toServerlessCloudFormation(arc) {
  let exec = count(arc) > 100? toCFN : toSAM
  return exec(arc)
}

// alias out direct methods
toServerlessCloudFormation.toCFN = toCFN
toServerlessCloudFormation.toSAM = toSAM

/**
 * @param {Object} arc - parsed arfile
 * @returns {Object} templates - nested template files for packaging/deployment
 */
function toCFN(arc) {
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
  return template
}

/**
 * @param {Object} arc - parsed arfile
 * @returns {CloudFormation::Serverless} template
 */
function toSAM(arc) {

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
