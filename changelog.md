# `@architect/package` changelog

---

## [1.0.50] 2019-10-24

### Fix

- Fix `.arc-config` properties: `layers` and `policies`
- Adds `ArcWebSocketPolicy` to the generated IAM Role

### Removed

- Generated CloudFormation template Output value `WSS` is now a plain URL without `wss://` or `https://` protocol or the suffix `@connections` (which was removed by AWS from the `ApiGatewayManagementApi`)
- Removed `ArcRoleReflection` policy from the generated IAM Role
