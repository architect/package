let visitTables = require('../../visitors/tables')
let toLogicalID = require('@architect/utils/to-logical-id')

module.exports = function tables(arc, template) {
  template = visitTables(arc, template)
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
  return template
}
