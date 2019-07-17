// an echo api
exports.handler = function http(req) {
  return {
    body: JSON.stringify(req)
  }
}
