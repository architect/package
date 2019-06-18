let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function events(arc, template) {
  arc.events.forEach(event=> {
    let name = toLogicalID(event)
    template.Resources[`${name}Topic`] = {
      Type: 'AWS::SNS::Topic',
      Properties: {
        DisplayName: name,
        Subscription: []
      }
    }
  })
  template.Resources.Role.Properties.Policies.push({
    PolicyName: 'ArcSimpleNotificationServicePolicy',
    PolicyDocument: {
      Statement: [{
        Effect: 'Allow',
        Action: 'sns:Publish',
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
  return template
}
