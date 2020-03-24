# `@architect/package` changelog

---

## [1.2.5] 2020-02-05

### Changed

- Updated dependencies
- If `@http` is defined a static bucket will be created (`@static` is now implicit)
- Updated `http-proxy` to support API Gateway HTTP APIs (say that three times fast)

---

## [1.2.3 - 1.2.4] 2020-02-05

### Fixed

- Issue with adding `FifoQueue` to CloudFormation

---

## [1.2.2] 2020-01-24

### Added
- `FifoQueue: true` default for `@queues` (override with `fifo false` in `.arc-config`)


### Fixed

- `VisibilityTimeout` will now match the coresponding `@queue` `timeout` value in `.arc-config`

---

## [1.2.1] 2020-01-22

### Changed

- Updated default Lambda runtime to `nodejs12.x` (formerly `nodejs10.x`)
- Updated dependencies

---

## [1.2.0] 2020-01-20

### Added

- Adds `PointInTimeRecovery` attribute to tables defined in `.arc` for DynamoDB Point In Time Recovery support.

---

## [1.1.0] 2020-01-18

### Added

- Adds `encrypt` attribute to tables defined in `.arc` for DynamoDB Encryption using customer or AWS managed keys

---

## [1.0.56] 2020-01-06

### Changed

- Updated dependencies
- Updated calls to various `utils` methods

---


## [1.0.55] 2019-12-18

### Added

- Deno support!

---

## [1.0.54] 2019-12-01

### Added

- Adds `/staging` path part to WSS URL for printing and env vars


### Changed

- Updated dependencies

---

## [1.0.52 - 1.0.53] 2019-11-19

### Changed

- Bump max resources to 200 per CloudFormation limit (was 100)
- Updated dependencies

---

## [1.0.51] 2019-11-01

### Changed

- Updated dependencies

---

## [1.0.50] 2019-10-24

### Fix

- Adds `ArcWebSocketPolicy` to the generated IAM Role
- Adds `ARC_WSS_URL` environment variable to all Lambdas if `@ws` is defined
- Fix `.arc-config` properties: `layers` and `policies`
  - adding one layer or policy per line: `layers my:arn:here` or `policies my:arn:here`
  - adding arns as a list (two spaces indented below `layers` or `policies`)
  - eg:

```arc
@aws
layers
  my:arn:here
  my:other:arn:here
```

### Removed

- Generated CloudFormation template Output value `WSS` is now a plain URL without `wss://` or `https://` protocol, without the `/staging` and `/production` path part, and the suffix `@connections` (which was removed by AWS from the `ApiGatewayManagementApi`)
- Removed `ArcRoleReflection` policy from the generated IAM Role
- Removed `PYTHONPATH` unless a Lambda function explicitly has a Python runtime
