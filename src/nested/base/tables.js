let visitTables = require('../../visitors/tables')
let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function tables(arc, template) {
  template = visitTables(arc, template)
  template = stripFunctions(arc, template)
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
  return template
}

// remove stream functions
function stripFunctions(arc, template) {
  arc.tables.forEach(table=> {

    let tbl = Object.keys(table)[0]
    let attr = table[tbl]
    let hasLambda = attr.hasOwnProperty('stream')
    let TableName = toLogicalID(tbl)

    if (hasLambda) {
      let name = `${TableName}Stream`
      delete template.Resources[name]
    }
  })
  //console.log('nested/base/tables', template.Resources)
  return template
}
