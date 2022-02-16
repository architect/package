let addStatic = require('./add-static-proxy')

// See https://docs.aws.amazon.com/general/latest/gr/s3.html#s3_website_region_endpoints
function getBucketUrlForRegion (region) {
  let olderRegions = [
    'us-east-1',
    'us-west-1',
    'us-west-2',
    'us-gov-west-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'sa-east-1',
    'eu-west-1',
  ]
  if (olderRegions.includes(region)) {
    return 'http://${bukkit}.s3-website-${AWS::Region}.amazonaws.com'
  }
  return 'http://${bukkit}.s3-website.${AWS::Region}.amazonaws.com'
}

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
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'BucketOwnerEnforced'
          }
        ]
      },
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
        getBucketUrlForRegion(inv.aws.region),
        { bukkit: { Ref: 'StaticBucket' } }
      ]
    }
  }

  // Allow public read access to all objects in the static bucket
  template.Resources.StaticBucketPolicy = {
    Type: 'AWS::S3::BucketPolicy',
    Properties: {
      Bucket: { Ref: 'StaticBucket' },
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: [ 's3:GetObject' ],
            Effect: 'Allow',
            Principal: '*',
            Resource: [ {
              'Fn::Sub': [
                'arn:aws:s3:::${bukkit}/*',
                { bukkit: { Ref: 'StaticBucket' } }
              ]
            } ],
            Sid: 'PublicReadGetObject'
          }
        ]
      }
    }
  }

  // if an api is defined then add _static proxy and attempt to serialize ./public
  if (inv.http) {
    template = addStatic(inventory, template)
  }

  return template
}
