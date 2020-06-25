let aws = require('aws-sdk')
let series = require('run-series')
let parallel = require('run-parallel')
let { toCFN } = require('../')
let utils = require('@architect/utils')
let path = require('path')
let fs = require('fs')
let sam = require('./package')
let spawn = require('./spawn')

/**
 * deploy
 *
 * Deploys an .arc file as a nested cloudformation stack.
 *
 * (Note: all params are optional)
 *
 * @param {Object} params
 * @param {Boolean} params.log - enable/disable logging (default false)
 * @param {Boolean} params.verbose - enable/disable verbose logging (default false)
 * @param {Boolean} params.production - deploy to production (default false)
 * @param {Boolean} params.production - deploy to production (default false)
 * @param {Boolean} params.clean - delete generated files (default true)
 * @param {Object} params.arc - parsed .arc file (if not passed in will read the .arc in cwd)
 * @param {Function} callback - node style errback
 * @returns {Promise}
 */
module.exports = function deploy (params = {}, callback) {

  /**
 * the basic flow is this:
 *
 * 1.) reads the current .arc generates cfn templates:
 *
 * - appname-cfn.json
 * - appname-cfn-http.json
 * - appname-cfn-events.json
 * - appname-cfn-queues.json
 * - appname-cfn-tables.json
 *
 * 2.) package all templates into yaml (and uploads assets to the cfn bucket):
 *
 * - appname-cfn.yaml
 * - appname-cfn-http.yaml
 * - appname-cfn-events.yaml
 * - appname-cfn-queues.yaml
 * - appname-cfn-tables.yaml
 *
 * 3.) runs `sam deploy` on:
 *
 * - appname-cfn.yaml
 */

  // return a promise if no callback is supplied
  let promise
  if (!callback) {
    promise = new Promise(function ugh (res, rej) {
      callback = function errback (err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

  // params
  let log = params.log || false
  let verbose = params.verbose || false
  let production = params.production || false
  let arc = params.arc || utils.readArc().arc
  let clean = params.clean || true

  // derived
  let cfn = toCFN(arc)
  let bucket = arc.aws.find(o => o[0] === 'bucket')[1]
  let appname = arc.app[0]
  let name = `${utils.toLogicalID(appname)}${production ? 'Production' : 'Staging'}`

  series([
    function toCFN (callback) {
      parallel(Object.keys(cfn).map(k => {
        return function writes (callback) {
          fs.writeFile(k, JSON.stringify(cfn[k], null, 2), callback)
        }
      }), callback)
    },

    function samPackage (callback) {
      series(Object.keys(cfn).map(k => {
        return function packages (callback) {
          sam({
            filename: k,
            bucket,
            log,
            verbose,
          }, callback)
        }
      }), callback)
    },

    function uploadToS3 (callback) {
      let s3 = new aws.S3
      parallel(Object.keys(cfn).map(k => {
        return function uploads (callback) {
          let Key = k.replace('json', 'yaml')
          let Body = fs.readFileSync(path.join(process.cwd(), Key))
          s3.putObject({
            Bucket: bucket,
            Key,
            Body,
          }, callback)
        }
      }), callback)
    },

    function samDeploy (callback) {
      spawn('sam', [ 'deploy',
        '--template-file', `${appname}-cfn.yaml`,
        '--stack-name', name,
        '--s3-bucket', bucket,
        '--capabilities', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_IAM'
      ], { log, verbose }, callback)
    },

    function cleanup (callback) {
      if (clean) {
        parallel(Object.keys(cfn).map(k => {
          return function writes (callback) {
            fs.unlink(path.join(process.cwd(), k), callback)
          }
        }), callback)
      }
      else {
        callback()
      }
    }

  ], callback)
  return promise
}
