// an echo api
exports.handler = async function http (req) {
  return {
    body: JSON.stringify(req)
  }
}
