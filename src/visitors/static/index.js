let addStatic = require('./add-static-proxy')

/**
 * Visit arc.static and merge in AWS::Serverless resources
 */
module.exports = function visitStatic (inventory, template) {
  let { inv } = inventory
  if (!inv.static) return template

  // Leave the bucket name generation up to CloudFormation
  template.Resources.StaticBucket = {
    Type: 'AWS::S3::Bucket',
    Properties: {
      AccessControl: 'PublicRead',
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
        ErrorDocument: '404.html'
      }
    }
  }

  // Which means we need to share it here
  template.Outputs.BucketURL = {
    Description: 'Bucket URL',
    Value: {
      'Fn::Sub': [
        'http://${bukkit}.s3-website-${AWS::Region}.amazonaws.com',
        { bukkit: { Ref: 'StaticBucket' } }
      ]
    }
  }

  // if an api is defined then add _static proxy and attempt to serialize ./public
  if (inv.http) {
    template = addStatic(inventory, template)
  }

  return template
}
