let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function cloudfront(arc, template) {

  if (!template.Resources)
    template.Resources = {}

  if (!template.Outputs)
    template.Outputs = {}

  if (arc.cdn) {
    template.Resources.Edge = cf(arc)
    template.Outputs.CDN = {
      Description: 'CloudFront',
      Value: {
        'Fn::GetAtt': ['Edge', 'DomainName']
      }
    }
  }

  return template
}

/**
 * returns an Origin
 */
function origin({appname, http}) {

  let httpOrigin = {
    'Fn::Sub': [
      '${restApiId}.execute-api.${AWS::Region}.amazonaws.com',
      {restApiId: {Ref: appname}}
    ]
  }

  let staticOrigin = {
    'Fn::Sub': [
      '${bukkit}.s3-website-${AWS::Region}.amazonaws.com',
      {bukkit: {'Ref': 'StaticBucket'}}
    ]
  }

  let base = {
    Id: 'EdgeOrigin',
    DomainName: http? httpOrigin : staticOrigin,
    CustomOriginConfig: {
      HTTPPort: 80,
      HTTPSPort: 443,
      OriginKeepaliveTimeout: 5, // NOTE FOR RYAN: up this for API edge config
      OriginProtocolPolicy: http? 'https-only' : 'http-only', // thas right
      OriginReadTimeout: 30,
      OriginSSLProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
    }
  }

  if (http) {
    base.OriginPath = '/production'
  }

  return base
}


/**
 * returns AWS::CloudFront::Distribution
 */
function cf(arc) {
  let appname = toLogicalID(arc.app[0])
  let {static, http} = arc
  return {
    Type: "AWS::CloudFront::Distribution",
    DependsOn: http? appname : 'StaticBucket',
    Properties: {
      DistributionConfig: {
        HttpVersion: 'http2',
        IPV6Enabled: true,
        //Comment: `Created ${new Date(Date.now()).toISOString()}`,
        Enabled: true,
        Origins: [origin({appname, static, http})],
        DefaultCacheBehavior: {
          TargetOriginId: 'EdgeOrigin',
          ForwardedValues: {
            QueryString: true,
            Cookies: {Forward: 'all'},
          },
          ViewerProtocolPolicy: 'redirect-to-https',
          MinTTL: 0,
          AllowedMethods: ['HEAD', 'DELETE', 'POST', 'GET', 'OPTIONS', 'PUT', 'PATCH'],
          CachedMethods: ['GET', 'HEAD'],
          SmoothStreaming: false,
          DefaultTTL: 86400,
          MaxTTL: 31536000,
          Compress: true, // Important!
        },
        PriceClass: 'PriceClass_All',
        ViewerCertificate: {
          CloudFrontDefaultCertificate: true,
          MinimumProtocolVersion: 'TLSv1.1_2016', // AWS recommended setting ¯\_(ツ)_/¯
          //SSLSupportMethod: 'sni-only',
          //SslSupportMethod: 'sni-only'
        }
      }
    }
  }
}
