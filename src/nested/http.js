let {version} = require('../../package.json')
let http = require('../visitors/http')
let addStatic = require('../visitors/static/add-static-proxy')

module.exports = function nestHTTP(arc) {
  let template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    Description: `Exported by architect/package@${version} on ${new Date(Date.now()).toISOString()}`,
    Parameters: {
      Role: {
        Type:'String',
        Description: 'IAM Role ARN'
      }
    }
  }
  let visitor = (template, method)=> method(arc, template)
  let tasks = [http, tidyRefToRole]
  if (arc.static) {
    template.Parameters.StaticBucket = {
      Type: 'String',
      Description: 'Static Bucket ARN'
    }
    tasks.push(addStatic)
  }
  return tasks.reduce(visitor, template)
}

// remaps refs from singularity template to passed in Parameters.Role
function tidyRefToRole(arc, template) {
  Object.keys(template.Resources).forEach(resource=> {
    if (template.Resources[resource].Type === 'AWS::Serverless::Function') {
      template.Resources[resource].Properties.Role = {Ref: 'Role'}
    }
  })
  return template
}
