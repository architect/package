module.exports = function resourceCount(arc) {
  let count = 1 //role
  count += 1 // policy

  if (arc.http) {
    count += 1 //restapi
    count += 1 //deployment
    count += 1 //stage
    count += 1 //invokeproxypermission
    count += (arc.http.length*3) // lambda + permission + testpermission
  }

  if (arc.events)
    count += (arc.events.length*3) // lambda + permissino + topicsubscription

  if (arc.tables)
    count += arc.tables.length

  if (arc.static)
    count += 1 // bucket

  if (arc.ws) {
    count += 1 // wsapi
    count += 3 // lambdas
  }

  if (arc.queues)
    count += arc.queues.length

  if (arc.scheduled)
    count += arc.scheduled.length

  return count
}
