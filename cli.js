let inventory = require('@architect/inventory')
let config = require('.')
let chalk = require('chalk')
let fs = require('fs')

module.exports = function package (/* opts*/) {
  inventory({}, function (err, result) {
    if (err) throw err
    else {
      fs.writeFileSync('sam.json', JSON.stringify(config(result), null, 2))

      // draw the deploy instructions
      let pkg = `sam package --template-file sam.json --output-template-file out.yaml --s3-bucket [S3 bucket]`
      let dep = `sam deploy --template-file out.yaml --stack-name [Stack Name] --s3-bucket [S3 bucket] --capabilities CAPABILITY_IAM`
      let sam = chalk.bold.green(pkg)
      let cf = chalk.bold.green(dep)

      let x = process.platform.startsWith('win') ? ' √' : '✓'
      let f = chalk.cyan.bold('sam.json')

      console.log(chalk.grey(`${x} Successfully created ${f}! Now deploy it by following these steps:

    1.) Package code with SAM:
    ${sam}

    2.) Deploy the CloudFormation stack:
    ${cf}
      `))
    }
  })
}
