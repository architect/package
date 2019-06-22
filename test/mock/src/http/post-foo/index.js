// learn more about http functions here: https://arc.codes/guides/http
exports.handler = async function http(req) {
  console.log(req)
  return {
    headers: {'content-type': 'text/html; charset=utf8'},
    body: '<b>hello world</b> from nodejs'
  }
}
