let toLogicalID = require('@architect/utils/to-logical-id')
/**
 * visit arc and merge in any global AWS::Serverless resources
 *
 * - AWS::IAM::Role
 */
module.exports = function http(arc, template) {

  // interpolate required shape
  if (!template.Resources)
    template.Resources = {}

  let appname = arc.app[0]
  let name = `${toLogicalID(appname)}Role`

  // construct a least priv iam role
  template.Resources[name] = {
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
      Policies: [],
      // ManagedPolicyArns
      // PermissionsBoundary
    }
  }

  // enables logs and capability reflection
  template.Resources[name].Properties.Policies.push({
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
      },
      {
        Effect: 'Allow',
        Action: 'iam:GetRolePolicy',
        Resource: {
            'Fn::Sub': [
              'arn:aws:iam::${AWS::AccountId}:role/${name}',
              {role: {'Ref': name}}
            ]
          }
      }]
    }
  })

  // allow lambdas read/write on the static bucket
  if (arc.static) {
    template.Resources[name].Properties.Policies.push({
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
    template.Resources[name].Properties.Policies.push({
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
            'dynamodb:UpdateItem'
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
    template.Resources[name].Properties.Policies.push({
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

  if (arc.queues) {
    //allow lambdas to publish to queues

  }

  return template
}
