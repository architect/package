let { toLogicalID } = require('@architect/utils')
let { createLambda } = require('../utils')

/**
 * Visit arc['tables-streams'] and merge in AWS::Serverless resources
 */
module.exports = function visitTablesStreams (inventory, template) {
  let { inv } = inventory
  let streams = inv['tables-streams'] || inv.streams
  if (!streams) return template

  streams.forEach(lambda => {
    let { name, table } = lambda
    let streamLambda = `${toLogicalID(name)}TableStreamLambda`
    let streamEvent = `${toLogicalID(name)}TableStreamEvent`
    let tableTable = `${toLogicalID(table)}Table`

    // Create the Lambda
    template.Resources[streamLambda] = createLambda({
      lambda,
      inventory,
      template,
    })

    template.Resources[streamEvent] = {
      Type: 'AWS::Lambda::EventSourceMapping',
      Properties: {
        BatchSize: 10,
        EventSourceArn: { 'Fn::GetAtt': [ tableTable, 'StreamArn' ] },
        FunctionName: { 'Fn::GetAtt': [ streamLambda, 'Arn' ] },
        StartingPosition: 'TRIM_HORIZON'
      }
    }

    // Create the stream
    template.Resources[tableTable].Properties.StreamSpecification = {
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  })
  return template
}
