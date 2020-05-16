let toLogicalID = require('../../to-logical-id')

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
        Resource: getTopicArn(),
      }]
    }
  })

    function getTopicArn() {
      return {
        'Fn::Sub': [
          'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AWS::StackName}*',
          {}
        ]
      }
    }
  return template
}
