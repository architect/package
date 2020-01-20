module.exports = function clean(attr) {
  var clean = {}
  var notTtl = x => x !== 'TTL'
  var notLambda = x => x !== 'Lambda'
  var notStream = x => x !== 'stream'
  var notEncrypt = x => x !== 'encrypt'
  var notRecovery = x => x !== 'PointInTimeRecovery'

  Object.keys(attr).forEach(k=> {
    if (
      notTtl(attr[k]) &&
      notLambda(attr[k]) &&
      notStream(k.toLowerCase()) &&
      notEncrypt(k) &&
      notRecovery(k)
    ) {
      clean[k] = attr[k]
    }
  })
  return clean
}
