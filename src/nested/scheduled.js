let { version } = require('../../package.json')
let visit = require('../visitors/scheduled')

module.exports = function nestScheduled (arc) {

  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${new Date(Date.now()).toISOString()}`,
    Parameters: {
      Role: {
        Description: 'IAM Role ARN',
        Type: 'String'
      }
    },
    Resources: {},
    Outputs: {}
  }

  if (arc.static) {
    template.Parameters.StaticBucket = {
      Type: 'String',
      Description: 'Static Bucket ARN'
    }
  }

  return visit(arc, template)
}
