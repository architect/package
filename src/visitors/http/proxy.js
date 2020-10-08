module.exports = function proxy (arc, template) {

  let staging = arc.proxy.find(e => e[0] === 'staging')

  if (!staging) {
    throw SyntaxError(`@proxy missing 'staging' setting`)
  }

  // Overwrite the default route to point at the configured http endpoint
  template.Resources.HTTP.Properties.DefinitionBody.paths['/$default'] = {
    'x-amazon-apigateway-any-method': {
      isDefaultRoute: true,
      'x-amazon-apigateway-integration': {
        payloadFormatVersion: '1.0',
        type: 'http_proxy',
        httpMethod: 'ANY',
        uri: staging[1],
        connectionType: 'INTERNET',
        timeoutInMillis: 30000
      }
    }
  }

  return template
}
