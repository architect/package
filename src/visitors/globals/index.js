let ssm = require('./ssm')
let { toLogicalID } = require('@architect/utils')

/**
 * Visit arc and merge in any global AWS::Serverless resources
 *
 * - AWS::IAM::Role
 */
module.exports = function visitGlobals (inventory, template) {
  let { inv } = inventory

  // construct a least priv iam role
  template.Resources.Role = {
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [ {
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        } ]
      },
      Policies: []
    }
  }

  // Enables logs and capability reflection
  template.Resources.Role.Properties.Policies.push({
    PolicyName: 'ArcGlobalPolicy',
    PolicyDocument: {
      Statement: [ {
        Effect: 'Allow',
        Action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        Resource: 'arn:aws:logs:*:*:*'
      } ]
    }
  })

  // allow lambdas read/write on the static bucket
  if (inv.static) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcStaticBucketPolicy',
      PolicyDocument: {
        Statement: [ {
          Effect: 'Allow',
          Action: [
            's3:GetObject',
            's3:PutObject',
            's3:PutObjectAcl',
            's3:DeleteObject',
            's3:ListBucket', // Required after move to S3 OwnershipControls from AccessControl
          ],
          Resource: [ {
            'Fn::Sub': [
              'arn:aws:s3:::${bukkit}',
              { bukkit: { Ref: 'StaticBucket' } }
            ]
          },
          {
            'Fn::Sub': [
              'arn:aws:s3:::${bukkit}/*',
              { bukkit: { Ref: 'StaticBucket' } }
            ]
          } ]
        } ]
      }
    })
  }

  // Allow Lambdas full access to tables (with the exception of table deletion)
  if (inv.tables) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcDynamoPolicy',
      PolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Action: 'dynamodb:*',
            Resource: getTableArns(inv.tables),
          },
          {
            Effect: 'Deny',
            Action: 'dynamodb:DeleteTable',
            Resource: {
              'Fn::Sub': 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/*',
            },
          },
        ]
      }
    })
    function getTableArns (tables) {
      return tables.map(table => {
        let name = `${toLogicalID(table.name)}Table`
        return [ {
          'Fn::Sub': [
            'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}',
            { tablename: { Ref: name } }
          ]
        },
        {
          'Fn::Sub': [
            'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}/*',
            { tablename: { Ref: name } }
          ]
        } ]
      }).reduce((a, b) => a.concat(b), [])
    }
  }

  // allow lambdas to publish to events
  if (inv.events) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcSimpleNotificationServicePolicy',
      PolicyDocument: {
        Statement: [ {
          Effect: 'Allow',
          Action: [
            'sns:Publish',
          ],
          Resource: getTopicArn(),
        } ]
      }
    })
    function getTopicArn () {
      return {
        'Fn::Sub': [
          'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AWS::StackName}*',
          {}
        ]
      }
    }
  }

  // allow lambdas to publish to queues
  if (inv.queues) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcSimpleQueueServicePolicy',
      PolicyDocument: {
        Statement: [ {
          Effect: 'Allow',
          Action: [
            'sqs:SendMessageBatch',
            'sqs:SendMessage',
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
          ],
          Resource: '*'
        } ]
      }
    })
  }

  // rip in some ssm params
  template = ssm(inventory, template)

  return template
}
