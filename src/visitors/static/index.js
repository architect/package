let addStatic = require('./add-static-proxy')

/**
 * visit arc.static and merge in AWS::Serverless resources
 */
module.exports = function visitStatic (arc, template) {

  // Ensure standard CF sections exist
  if (!template.Resources) template.Resources = {}
  if (!template.Outputs) template.Outputs = {}

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
  if (arc.http) {
    template = addStatic(arc, template)
  }

  return template
}
