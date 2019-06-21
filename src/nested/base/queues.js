let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function events(arc, template) {
  arc.queues.forEach(event=> {
    let name = toLogicalID(event)
    template.Resources[`${name}Queue`] = {
      Type: 'AWS::SQS::Queue',
      Properties: {}
    }
  })
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
  return template
}
