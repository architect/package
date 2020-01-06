let {toLogicalID} = require('@architect/utils')
let events = require('./events')
let policy = require('./policy')
let queues = require('./queues')
let statics = require('./static')
let tables = require('./tables')
let ssm = require('../../visitors/globals/ssm')
let {version} = require('../../../package.json')

/**
 * base is the root cfn template
 * - it contains the primary iam role
 * - this role allows read/write access to .arc defined dynamo tables, sns topics and sqs queues
 * - it contains resources we need to lock down with the app iam role
 */
module.exports = function globals(arc) {

  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${new Date(Date.now()).toISOString()}`,
    Outputs: {},
    Resources: {
      Role: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }]
          },
          Policies: [policy]
        }
      },
      RoleReflectionPolicy: {
        Type: 'AWS::IAM::Policy',
        DependsOn: 'Role',
        Properties: {
          PolicyName: `ArcRoleReflectionPolicy`,
          PolicyDocument: {
            Statement: [{
              Effect: 'Allow',
              Action: 'iam:GetRolePolicy',
              Resource: {
                'Fn::Sub': [
                  'arn:aws:iam::${AWS::AccountId}:role/${role}',
                  {role: {'Ref': 'Role'}}
                ]
              }
            }]
          },
          Roles: [{'Ref': 'Role'}],
        }
      }
    }
  }

  // mix in params
  template = ssm(arc, template)

  // mix in global assets that we need to secure w the IAM Role
  if (arc.static)
    template = statics(arc, template)

  if (arc.tables)
    template = tables(arc, template)

  if (arc.events)
    template = events(arc, template)

  if (arc.queues)
    template = queues(arc, template)

  // start nesting templates for functions!
  let appname = arc.app[0]
  let bucket = arc.aws.find(t=> t[0] === 'bucket')[1]

  // nest an http stack
  // passing in references to rol and static bucket if defined
  if (arc.http) {
    template.Resources.HTTP = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: {
          'Fn::Sub': [
            'http://${bucket}.s3.${AWS::Region}.amazonaws.com/${file}',
            {bucket, file:`${appname}-cfn-http.yaml`}
          ]
        },
        Parameters: {
          Role: {'Fn::GetAtt': ['Role', 'Arn']},
        }
      }
    }
    template.Outputs.API = {
      Value: {'Fn::GetAtt': ['HTTP', 'Outputs.API']},
      Description: 'API Gateway'
    }
    template.Outputs.restApiId = {
      Value: {'Fn::GetAtt': ['HTTP', 'Outputs.restApiId']},
      Description: 'restApiId'
    }
    if (arc.static) {
      template.Resources.HTTP.Properties.Parameters.StaticBucket = {Ref: 'StaticBucket'}
      template.Outputs.Public = {
        Value: {'Fn::GetAtt': ['StaticBucket', 'WebsiteURL']},
        Description: 'S3 Bucket'
      }
    }
  }

  // nest an events stack
  // passing in references to sns topics and role
  if (arc.events) {
    template.Resources.Events = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: {
          'Fn::Sub': [
            'http://${bucket}.s3.${AWS::Region}.amazonaws.com/${file}',
            {bucket, file: `${appname}-cfn-events.yaml`}
          ]
        },
        Parameters: {
          Role: {'Fn::GetAtt': ['Role', 'Arn']}
        }
      }
    }
    arc.events.forEach(event=> {
      let name = `${toLogicalID(event)}Topic`
      template.Resources.Events.Properties.Parameters[name] = {Ref: name}
      template.Outputs[name] = {
        Value: {'Fn::GetAtt': [name, 'TopicName']},
        Description: 'SNS Topic'
      }
    })
    if (arc.static) {
      template.Resources.Events.Properties.Parameters.StaticBucket = {Ref: 'StaticBucket'}
    }
  }

  // nest a scheduled stack
  if (arc.scheduled) {
    template.Resources.Scheduled = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: {
          'Fn::Sub': [
            'http://${bucket}.s3.${AWS::Region}.amazonaws.com/${file}',
            {bucket, file:`${appname}-cfn-scheduled.yaml`}
          ]
        },
        Parameters: {
          Role: {'Fn::GetAtt': ['Role', 'Arn']},
        }
      }
    }
    if (arc.static) {
      template.Resources.Scheduled.Properties.Parameters.StaticBucket = {Ref: 'StaticBucket'}
    }
  }

  // nest a queues stack
  // passing in references to sqs queue arns and role
  if (arc.queues) {
    template.Resources.Queues = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: {
          'Fn::Sub': [
            'http://${bucket}.s3.${AWS::Region}.amazonaws.com/${file}',
            {bucket, file: `${appname}-cfn-queues.yaml`}
          ]
        },
        Parameters: {
          Role: {'Fn::GetAtt': ['Role', 'Arn']}
        }
      }
    }
    arc.queues.forEach(event=> {
      let name = `${toLogicalID(event)}Queue`
      template.Resources.Queues.Properties.Parameters[name] = {'Fn::GetAtt': [name, 'Arn']}
    })
    if (arc.static) {
      template.Resources.Queues.Properties.Parameters.StaticBucket = {Ref: 'StaticBucket'}
    }
  }

  // nest table streams stack
  let hasStream = tbl=> tbl[Object.keys(tbl)[0]].hasOwnProperty('stream')
  if (arc.tables && arc.tables.some(hasStream)) {
    template.Resources.Tables = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: {
          'Fn::Sub': [
            'http://${bucket}.s3.${AWS::Region}.amazonaws.com/${file}',
            {bucket, file: `${appname}-cfn-tables.yaml`}
          ]
        },
        Parameters: {
          Role: {'Fn::GetAtt': ['Role', 'Arn']}
        }
      }
    }
    arc.tables.forEach(table=> {
      let tbl = Object.keys(table)[0]
      let name = `${toLogicalID(tbl)}Table`
      template.Resources.Tables.Properties.Parameters[name] = {'Fn::GetAtt': [name, 'StreamArn']}
    })
    if (arc.static) {
      template.Resources.Tables.Properties.Parameters.StaticBucket = {Ref: 'StaticBucket'}
    }
  }

  return template
}
