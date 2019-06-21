let toLogicalID = require('@architect/utils/to-logical-id')
/**
 * visit arc and merge in any global AWS::Serverless resources
 *
 * - AWS::IAM::Role
 */
module.exports = function globals(arc, template) {

  // interpolate required shape
  if (!template.Resources)
    template.Resources = {}

  // construct a least priv iam role
  template.Resources.Role = {
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
      Policies: []
    }
  }

  // allow runtime to reflect permissions
  template.Resources.RoleReflectionPolicy = {
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

  // enables logs and capability reflection
  template.Resources.Role.Properties.Policies.push({
    PolicyName: 'ArcGlobalPolicy',
    PolicyDocument: {
      Statement: [{
        Effect: 'Allow',
        Action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        Resource: 'arn:aws:logs:*:*:*'
      }]
    }
  })

  // allow lambdas read/write on the static bucket
  if (arc.static) {
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
  }

  // allow lambdas to CRUD tables
  if (arc.tables) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcDynamoPolicy',
      PolicyDocument: {
        Statement: [{
          Effect: 'Allow',
          Action: [
            // no scan!
            'dynamodb:BatchGetItem',
            'dynamodb:BatchWriteItem',
            'dynamodb:PutItem',
            'dynamodb:DeleteItem',
            'dynamodb:GetItem',
            'dynamodb:Query',
            'dynamodb:UpdateItem',
            'dynamodb:GetRecords',
            'dynamodb:GetShardIterator',
            'dynamodb:DescribeStream',
            'dynamodb:ListStreams'
          ],
          Resource: getTableArns(arc.tables),
        }]
      }
    })
    function getTableArns(tbls) {
      let flip = tbl=> Object.keys(tbl)[0]
      return tbls.map(flip).map(table=> {
        let name = `${toLogicalID(table)}Table`
        return {
          'Fn::Sub': [
            'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tablename}',
            {tablename: {'Ref': name}}
          ]
        }
      })
    }
  }

  // allow lambdas to publish to events
  if (arc.events) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcSimpleNotificationServicePolicy',
      PolicyDocument: {
        Statement: [{
          Effect: 'Allow',
          Action: [
            'sns:Publish',
            //'sns:ListTopics'
          ],
          Resource: getTopicArns(arc.events),
        }]
      }
    })
    function getTopicArns(topics) {
      return topics.map(topic=> {
        let name = `${toLogicalID(topic)}Topic`
        return {
          'Fn::Sub': [
            'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topic}',
            {topic: {'Ref': name}}
          ]
        }
      })
    }
  }

  // allow lambdas to publish to queues
  if (arc.queues) {
    template.Resources.Role.Properties.Policies.push({
      PolicyName: 'ArcSimpleQueueServicePolicy',
      PolicyDocument: {
        Statement: [{
          Effect: 'Allow',
          Action: [
            'sqs:SendMessageBatch',
            'sqs:SendMessage',
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
          ],
          Resource: '*'//getQueueArns(arc.queues),
        }]
      }
    })
    /*
    function getQueueArns(queues) {
      return queues.map(q=> {
        let name = `${toLogicalID(q)}Queue`
        return {
          'Fn::Sub': [
            'arn:aws:sqs:${AWS::Region}:${AWS::AccountId}:${queue}',
            {queue: {Ref: name}}
          ]
        }
      })
    }*/
  }

  return template
}
