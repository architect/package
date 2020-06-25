/**
 * @table
 * mytablename
 *   myid *String
 *   recovery true
 */
module.exports = function getHasPointInTimeRecovery (attr) {
  return attr.PointInTimeRecovery
}
