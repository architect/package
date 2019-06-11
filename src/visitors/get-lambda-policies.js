let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function getPolicies(arc) {

  let policies = []

  // add permissions to acess tables
  if (arc.tables) {
    arc.tables.forEach(table=> {
      let tbl = Object.keys(table)[0]
      let TableName = toLogicalID(tbl)
      policies.push({DynamoDBCrudPolicy: {TableName}})
    })
  }

  // add permission to read from static bucket
  if (arc.static) {
    policies.push({S3ReadPolicy: {BucketName: {Ref: 'StaticBucket'}}})
  }

  // add permission to pub/sub sns topics
  if (arc.events) {
    arc.events.forEach(event=> {
      let name = `${toLogicalID(event)}Topic`
      policies.push({SNSCrudPolicy: {TopicName: {Ref: name}}})
    })
  }

  return policies
}
