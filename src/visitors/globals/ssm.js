let { toLogicalID } = require('@architect/utils')

module.exports = function ssm ({ inv }, template) {
  let hasParams = false

  if (inv.tables) {
    hasParams = true
    inv.tables.forEach(({ name }) => {
      let Table = toLogicalID(name)
      let TableName = `${Table}Table`
      let TableParam = `${Table}Param`
      template.Resources[TableParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties: {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/tables/${tablename}',
              { tablename: name }
            ]
          },
          Value: { Ref: TableName }
        }
      }
    })
  }

  if (inv.events) {
    hasParams = true
    inv.events.forEach(({ name }) => {
      let Event = `${toLogicalID(name)}EventTopic`
      let EventParam = `${Event}Param`
      template.Resources[EventParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties: {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/events/${event}',
              { event: name }
            ]
          },
          Value: { Ref: Event }
        }
      }
    })
  }

  if (inv.queues) {
    hasParams = true
    inv.queues.forEach(({ name }) => {
      let Queue = `${toLogicalID(name)}Queue`
      let QueueParam = `${Queue}Param`
      template.Resources[QueueParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties: {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/queues/${queue}',
              { queue: name }
            ]
          },
          Value: { Ref: Queue }
        }
      }
    })
  }

  if (inv.static) {
    hasParams = true
    template.Resources.StaticBucketParam = {
      Type: 'AWS::SSM::Parameter',
      Properties: {
        Type: 'String',
        Name: {
          'Fn::Sub': [
            '/${AWS::StackName}/static/${key}',
            { key: 'bucket' }
          ]
        },
        Value: { Ref: 'StaticBucket' }
      }
    }

    let fingerprint = inv.static.fingerprint ? true : false
    template.Resources[`Static${toLogicalID('fingerprint')}Param`] = {
      Type: 'AWS::SSM::Parameter',
      Properties: {
        Type: 'String',
        Name: {
          'Fn::Sub': [
            '/${AWS::StackName}/static/${key}',
            { key: 'fingerprint' }
          ]
        },
        Value: `${fingerprint}`
      }
    }
  }

  if (hasParams) {
    template.Resources.ParameterStorePolicy = {
      Type: 'AWS::IAM::Policy',
      DependsOn: 'Role',
      Properties: {
        PolicyName: `ArcParameterStorePolicy`,
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'ssm:GetParametersByPath',
                'ssm:GetParameter',
              ],
              Resource: {
                'Fn::Sub': [
                  'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${AWS::StackName}',
                  {}
                ]
              }
            },
            {
              Effect: 'Allow',
              Action: [
                'ssm:GetParametersByPath',
                'ssm:GetParameter',
              ],
              Resource: {
                'Fn::Sub': [
                  'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${AWS::StackName}/*',
                  {}
                ]
              }
            },
            {
              Effect: 'Allow',
              Action: [
                'ssm:GetParametersByPath',
                'ssm:GetParameter',
              ],
              Resource: {
                'Fn::Sub': [
                  'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${AWS::StackName}/*/*',
                  {}
                ]
              }
            },
          ]
        },
        Roles: [ { Ref: 'Role' } ],
      }
    }
  }

  return template
}
