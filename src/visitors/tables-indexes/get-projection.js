module.exports = function getProjection (index) {
  let { projectionAttributes, projectionType } = index

  let projectionCfn = { ProjectionType: projectionType }
  if (projectionAttributes) {
    projectionCfn.NonKeyAttributes = projectionAttributes
  }

  return projectionCfn
}
