let spawn = require('./spawn')

module.exports = function samPackage({filename, bucket, log, verbose}, callback) {
  spawn('sam', [
    'package',
    '--template-file',
    filename,
    '--output-template-file',
    filename.replace('json', 'yaml'),
    '--s3-bucket',
    bucket
  ], {log, verbose}, callback)
}
