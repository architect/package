let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function ssm(arc, template) {

  if (!template.Resources)
    template.Resources = {}

  let hasParams = false

  if (arc.tables) {
    hasParams = true
    arc.tables.forEach(table=> {
      let tablename = Object.keys(table)[0]
      let Table = toLogicalID(tablename)
      let TableName = `${Table}Table`
      let TableParam = `${Table}Param`
      template.Resources[TableParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties : {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/tables/${tablename}',
              {tablename}
            ]
          },
          Value: {Ref: TableName}
        }
      }
    })
  }

  if (arc.events) {
    hasParams = true
    arc.events.forEach(event=> {
      let Event = `${toLogicalID(event)}Topic`
      let EventParam = `${Event}Param`
      template.Resources[EventParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties : {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/events/${event}',
              {event}
            ]
          },
          Value: {Ref: Event}
        }
      }
    })
  }

  if (arc.queues) {
    hasParams = true
    arc.queues.forEach(q=> {
      let Queue = `${toLogicalID(q)}Queue`
      let QueueParam = `${Queue}Param`
      template.Resources[QueueParam] = {
        Type: 'AWS::SSM::Parameter',
        Properties : {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/queues/${q}',
              {q}
            ]
          },
          Value: {Ref: Queue}
        }
      }
    })
  }

  if (arc.static) {
    hasParams = true
    template.Resources.StaticBucketParam = {
      Type: 'AWS::SSM::Parameter',
      Properties : {
        Type: 'String',
        Name: {
          'Fn::Sub': [
            '/${AWS::StackName}/static/${key}',
            {key: 'bucket'}
          ]
        },
        Value: {Ref: 'StaticBucket'}
      }
    }
    ;['fingerprint'].forEach(key=> {
      let find = t=> t[0] === key
      let hasKey = arc.static.some(find)
      let Value = hasKey? arc.static.find(find)[1]+'' : 'false'
      template.Resources[`Static${toLogicalID(key)}Param`] = {
        Type: 'AWS::SSM::Parameter',
        Properties : {
          Type: 'String',
          Name: {
            'Fn::Sub': [
              '/${AWS::StackName}/static/${key}',
              {key}
            ]
          },
          Value
        }
      }
    })
  }

  if (arc.ws) {
    hasParams = true
    template.Resources.WebsocketParam = {
      Type: 'AWS::SSM::Parameter',
      Properties : {
        Type: 'String',
        Name: {
          'Fn::Sub': [
            '/${AWS::StackName}/ws/${key}',
            {key: 'wss'}
          ]
        },
        Value: {
          'Fn::Sub': [
            'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/${stage}',
            {stage: 'production'}
          ]
        }
      }
    }
    template.Resources.WebsocketConnectionParam = {
      Type: 'AWS::SSM::Parameter',
      Properties : {
        Type: 'String',
        Name: {
          'Fn::Sub': [
            '/${AWS::StackName}/ws/${key}',
            {key: 'https'}
          ]
        },
        Value: {
          'Fn::Sub': [
            'wss://${WS}.execute-api.${AWS::Region}.amazonaws.com/${stage}',
            {stage: 'production'}
          ]
        }
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
          Statement: [{
            Effect: 'Allow',
            Action: 'ssm:GetParametersByPath',
            Resource: {
              'Fn::Sub': [
                'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${AWS::StackName}',
                {}
              ]
            }
          }]
        },
        Roles: [{'Ref': 'Role'}],
      }
    }
  }

  return template
}
