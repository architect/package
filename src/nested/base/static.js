module.exports = function statics(arc, template) {
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
  template.Resources.Role.Properties.Policies.push({
    PolicyName: 'ArcStaticBucketPolicy',
    PolicyDocument: {
      Statement: [{
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject'
        ],
        Resource: {
          'Fn::Sub': [
            'arn:aws:s3:::${bukkit}',
            {bukkit: {'Ref': 'StaticBucket'}}
          ]
        }
      }]
    }
  })
  return template
}
