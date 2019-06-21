/**
 * @table
 * mytablename
 *   myid *String
 *   stream true
 */
module.exports = function getHasLambda(attr) {
  return attr.hasOwnProperty('stream')
}
