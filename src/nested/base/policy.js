module.exports = {
  PolicyName: 'ArcGlobalPolicy',
  PolicyDocument: {
    Statement: [ {
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams'
      ],
      Resource: 'arn:aws:logs:*:*:*'
    } ]
  }
}
