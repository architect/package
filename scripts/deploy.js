let aws = require('aws-sdk')
let series = require('run-series')
let parallel = require('run-parallel')
let {toCFN} = require('../')
let utils = require('@architect/utils')
let path = require('path')
let fs = require('fs')
let samPackage = require('./package')
let spawn = require('./spawn')

/**
 * read the current .arc
 * generate 3 files
 * - appname-cfn.json
 * - appname-cfn-http.json
 * - appname-cfn-events.json
 *
 * it will then run cloudformation package on all three emitting
 * - appname-cfn.yaml
 * - appname-cfn-http.yaml
 * - appname-cfn-events.yaml
 *
 * it will write
 * - s3-bucket/appname-cfn-http.yaml
 * - s3-bucket/appname-cfn-events.yaml
 *
 * it will run sam deploy on
 * - appname-cfn.yaml
 *
 */
module.exports = function deploy(params, callback) {

  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

  let log = params.log || false
  let verbose = params.verbose || false
  let production = params.production || false
  let arc = params.arc || utils.readArc().arc
  let cfn = toCFN(arc)
  let bucket = arc.aws.find(o=> o[0] === 'bucket')[1]
  let appname = arc.app[0]
  let name = `${utils.toLogicalID(appname)}${production? 'Production' : 'Staging'}`

  series([
    function toCFN(callback) {
      // writes:
      // - appname-cfn.json
      // - appname-cfn-http.json
      // - appname-cfn-events.json
      Object.keys(cfn).forEach(k=> {
        fs.writeFileSync(k, JSON.stringify(cfn[k], null, 2))
      })
      callback()
    },

    function packageHTTP(callback) {
      series([
        function base(callback) {
          samPackage({
            filename: `${appname}-cfn.json`,
            bucket,
            log,
            verbose,
          }, callback)
        },
        function http(callback) {
          samPackage({
            filename: `${appname}-cfn-http.json`,
            bucket,
            log,
            verbose,
          }, callback)
        },
        function events(callback) {
          samPackage({
            filename: `${appname}-cfn-events.json`,
            bucket,
            log,
            verbose,
          }, callback)
        }
      ], callback)
    },

    // upload the nested templates
    function uploadToS3(callback) {
      let s3 = new aws.S3
      parallel({
        http(callback) {
          let Key = `${appname}-cfn-http.yaml`
          let Body = fs.readFileSync(path.join(process.cwd(), Key))
          s3.putObject({
            Bucket: bucket,
            Key,
            Body,
          }, callback)
        },
        events(callback) {
          let Key = `${appname}-cfn-events.yaml`
          let Body = fs.readFileSync(path.join(process.cwd(), Key))
          s3.putObject({
            Bucket: bucket,
            Key,
            Body,
          }, callback)
        },
      }, callback)
    },

    // deploy base
    function samDeploy(callback) {
      spawn('sam', [
        'deploy',
        '--template-file',
        `${appname}-cfn.yaml`,
        '--stack-name',
        name,
        '--s3-bucket',
        bucket,
        '--capabilities',
        'CAPABILITY_AUTO_EXPAND',
        'CAPABILITY_IAM'
      ], {log, verbose}, callback)
    },

    function cleanup(callback) {
      let files = [
        `${appname}-cfn-events.json`,
        `${appname}-cfn-events.yaml`,
        `${appname}-cfn-http.json`,
        `${appname}-cfn-http.yaml`,
        `${appname}-cfn.json`,
        `${appname}-cfn.yaml`,
      ].map(f=> {
        return function deletes(callback) {
          fs.unlink(path.join(process.cwd(), f), callback)
        }
      })
      parallel(files, callback)
    }

  ], callback)

  return promise
}
