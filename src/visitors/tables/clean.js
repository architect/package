module.exports = function clean(attr) {
  var clean = {}
  var notTtl = x => x !== 'TTL'
  var notLambda = x => x !== 'Lambda'
  var notStream = x => x !== 'stream'
  var notEncrypt = x => x !== 'encrypt'

  Object.keys(attr).forEach(k=> {
    if (
      notTtl(attr[k]) &&
      notLambda(attr[k]) &&
      notStream(k.toLowerCase()) &&
      notEncrypt(k)
    ) {
      clean[k] = attr[k]
    }
  })
  return clean
}
