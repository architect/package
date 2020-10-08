/**
 * Helper to swap:
 * - Catchall syntax: /* to /{proxy+}
 * - Express syntax: /:paramID to /{paramID}
 */
module.exports = function renderRoute (completeRoute) {
  let parts = completeRoute.split('/')
  let better = parts.map(part => {
    let isParam = part[0] === ':'
    let isCatchall = part === '*'
    if (isParam) {
      return `{${part.replace(':', '')}}`
    }
    if (isCatchall) {
      return `{proxy+}`
    }
    else {
      return part
    }
  })
  return `${better.join('/')}`
}
