module.exports = function getProjection (index) {
  let projectionCfn = { ProjectionType: index.projectionType }
  if (index.projectionAttributes) {
    projectionCfn.NonKeyAttributes = index.projectionAttributes
  }
  return projectionCfn
}
