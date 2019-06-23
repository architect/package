let aws = require('aws-sdk')
let querystring = require('querystring')
let iam = new aws.IAM

exports.handler = async function http() {
  let data
  let statusCode = 200
  try {
    data = await iam.getRolePolicy({
      PolicyName: 'ArcDynamoPolicy',
      RoleName: process.env.ARC_ROLE
    }).promise()
    data = JSON.parse(querystring.unescape(data.PolicyDocument))
  }
  catch(e) {
    statusCode = 500
    data = {msg: e.message, stack: e.stack}
  }
  return {
    statusCode,
    headers: {'content-type': 'text/html; charset=utf8'},
    body: `<pre>${JSON.stringify(data, null, 2)}</pre>`
  }
}
