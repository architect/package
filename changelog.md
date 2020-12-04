# `@architect/package` changelog

---

## [6.0.1] 2020-12-04

### Changed

- Updated dependencies

---

## [6.0.0] 2020-11-28

### Changed

- Breaking change: Package now assumes Deploy will handle `static.json` injection into ASAP if fingerprinting is enabled

---

## [5.0.0] 2020-11-22

### Added

- Added support for custom file paths
- Added `ARC_ENV` env var to all functions


### Changed

- Implemented Inventory (`@architect/inventory`)
- Breaking change: Package now accepts an Inventory object, and no longer accepts a raw Architect object

---

## [4.0.1] 2020-10-27

### Fixed

- Fixed issue where API Gateway `HTTP` routes using `any` would not respect using Lambda payload format v1.0 (and would fall back to v2.0 mode)

---

## [4.0.0] 2020-10-26

### Added

- Added support for CloudFormation's new 500 resource limit! This makes us very happy!


### Changed

- Removed check for >200 CloudFormation resources, and related `nested` CloudFormation code path (which was not maintained and known to be broken)
- Removed `.toSAM` and `.toCFN` methods

---

## [3.0.1] 2020-10-12

### Fixed

- Fixed obscure false negative for adding Arc Static Asset Proxy when `@http` contains a route that looks like `get /:hey/there`

---

## [3.0.0] 2020-09-30

### Added

- Added support for `@http` catchall syntax (e.g. `get /api/*`)
- Added support for `@http` `head` + `options` methods
- Added support for `@http` `any` method syntax (e.g. `any /path`)
- Added support for `@proxy`


### Changed

- Breaking change: with the addition of `@http` `any` and `*`, default `get /` greedy catchall is now deprecated
  - To restore that behavior, either move your `get /` route to `any /*`, or just define a new `any /*` route
- Updated dependencies

---

## [2.0.0] 2020-09-15

### Added

- `HTTP` APIs are the new default when provisioning API Gateway resources
  - This only impacts Architect `@http`, which was formerly provisioned as `REST` APIs
  - `@architect/deploy` now provides backwards compatibility for `REST` APIs
  - More info: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html
  - Fixes #838


### Changed

- Removed experimental support for static mocks
- Internal change: implemented new code standard with `@architect/eslint-config`


### Fixed

- Fixed inadvertent mutation of `arc.http`

---

## [1.3.8] 2020-07-01

### Changed

- Apps now ensure least privilege HTTP methods on `/_static/*`, allowing only `GET`


### Fixed

- Fixed API Gateway issue that adds an extra stage called `Stage`
- Corrected internal configuration for static proxy

---

## [1.3.7] 2020-06-15

### Changed

- Updated dependencies

---

## [1.3.4 - 1.3.6] 2020-06-09

### Added

- Added layer region validation (instead of letting CloudFormation fail without a helpful error)


### Changed

- Removed `mkdirp` in favor of Node.js >= 10.x `mkdir` recursive
- Updated dependencies


### Fixed

- Fixed `@aws` configuration in root project manifest and `.arc-config`, especially pertaining to the use of `layer` or `layers`; fixes #852, ht @jessrosenfield!

---

## [1.3.3] 2020-05-17

### Changed

- Updates HTTP proxy lib to 3.10.0, which includes improved caching and pretty URL support
- If creating a FIFO queue, set `ContentBasedDeduplication` to be enabled by default; thanks @filmaj!

---

## [1.2.10 - 1.3.2] 2020-03-22

### Changed

- Updated dependencies
- If `@http` is defined a static bucket will be created (`@static` is now implicit)
- Updated `http-proxy` to support API Gateway HTTP APIs (say that three times fast)
- Fix missing `arc.static` bug in adding mocks

---

## [1.2.8 - 1.2.9] 2020-03-19

### Changed

- Updated dependencies

---

## [1.2.7] 2020-03-19

### Changed

- Updated npm config

---

## [1.2.6] 2020-03-19

### Fixed

- Fixes issue deploying FIFO queues

---


## [1.2.5] 2020-02-05

### Changed

- Updated dependencies

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
