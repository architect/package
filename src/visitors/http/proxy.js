module.exports = function proxy (arc, template) {

  let staging = arc.proxy.find(e => e[0] === 'staging')

  if (!staging) {
    throw SyntaxError(`@proxy missing 'staging' setting`)
  }

  // Clean up default root handler
  if (!arc.http || !arc.http.some(r => r[0] === 'get' && r[1] === '/')) {
    delete template.Resources.HTTP.Properties.DefinitionBody.paths['/']
    delete template.Resources.GetIndex
  }

  // Remove the default Lambda invoke permission
  delete template.Resources.InvokeDefaultPermission

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
