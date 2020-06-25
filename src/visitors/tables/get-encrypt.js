/**
 * @table
 * mytablename
 *   myid *String
 *   encrypt true
 *
 * @table
 * mytablename2
 *   myid *String
 *   encrypt mycmkarn
 */

module.exports = function getEncrypt (attr) {
  var found = false
  Object.keys(attr).forEach(k => {
    if (k === 'encrypt') {
      found = attr[k]
    }
  })
  return found
}
