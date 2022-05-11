# `@architect/package` changelog

---

## [8.1.3] 2022-05-10

### Changed

- Updated dependencies; sub-dep `lambda-runtimes` adds `nodejs16.x`.

---

## [8.1.2] 2022-04-29

- Fixed a CloudFormation syntax error that was introduced in 8.1.1; thanks @lpsinger!

---

## [8.1.1] 2022-04-28

### Added

- Relaxed `@tables` permissions in the default role


### Changed

- Use https, not http, for API Gateway proxy to static bucket; thanks @lpsinger!


### Fixed

- Reduced excess CloudFormation statements for `@tables`; thanks @frankleng!

---

## [8.1.0] 2022-03-24

### Added

- Added support for configuring Lambda's ephemeral storage feature

---

## [8.0.3] 2022-03-07

### Changed

- Upgraded Deno from 0.24.x to 1.19.1

---

## [8.0.2] 2022-03-03

### Fixed

- Fixed regression where S3 IAM policy could prevent `@architect/asap` from properly peeking into a directory to look for a default index.html file

---

## [8.0.1] 2022-03-01

### Added

- Added `ARC_STACK_NAME` env var to fix missing stack name data; fixes #1322, thanks @Lugana707, @pgte

---

## [8.0.0] 2022-01-13

### Added

- Architect 10 plugin API support!
- Added support for Inventory's `deployStage` property, allowing proper stage awareness to CloudFormation / SAM generation
  - Took over a variety of CloudFormation mutations in Deploy


### Changed

- Breaking change: Package can no longer be run via CLI, and now serves purely as a module generating CloudFormation
- Breaking change: `createFunction` helper exported for the plugins beta is now deprecated in favor of `set.customLambdas`
- Package now populates `ARC_SESSION_TABLE_NAME`, and prefers it to the non-namespaced `SESSION_TABLE_NAME`
  - Both are supported, we suggest using only `ARC_SESSION_TABLE_NAME` moving forward, as all non-namespaced env vars will be retired in a future release
- Breaking change: Package (and thus Architect) no longer automatically populates `NODE_ENV` + `ARC_CLOUDFORMATION` env vars
  - For environment identification needs, Architect now relies solely on `ARC_ENV`
  - Thus, `NODE_ENV` is returned to userland, and is entirely optional
- Stop publishing to the GitHub Package registry
- Migrate static bucket permissions from per-object ACLs to a bucket policy so users can customize the static bucket permissions using plugins
  - See: https://github.com/architect/package/pull/148, https://github.com/architect/deploy/pull/350


### Fixed

- Fixed issue where `@static prefix` + `spa` settings were not getting populated into root handlers other than `get /`
- Fixed issue where using `architect-default-policies` did not include SSM IAM permissions; thanks @tbeseda!

---

## [7.2.0] 2021-11-16

### Added

- Added support for `@tables-streams`, the fully customizable successor to `@tables` with `stream true`
  - Includes support for specifying multiple streams attached to a single table, as well as specifying custom source paths
  - For more see: https://arc.codes/tables-streams
- Added support for `@tables-indexes` (which will eventually supersede `@indexes`)
  - For more see: https://arc.codes/tables-indexes

---

## [7.1.1] 2021-10-12

### Changed

- Updated dependencies

---

## [7.1.0] 2021-09-30

### Added

- Added support for AWS's new Lambda `arm64` architecture via `@aws architecture` setting; default remains `x86_64`

---

## [7.0.3] 2021-09-27

### Changed

- Removed internal `ARC_HTTP` env var (partly used for Arc v5 backwards compat, which is no longer supported)

---

## [7.0.2] 2021-09-05

### Changed

- Updated dependencies


### Fixed

- Fixed issue where specified policies would not be adopted by Lambdas so long as the default role remained intact; fixes #1212
- Fixed issue where multiple layers or policies specified in a single line would lose all but the first
- Fixed a few minor bugs in unit tests

---

## [7.0.0 - 7.0.1] 2021-07-22

### Changed

- Breaking change: removed support for Node.js 10.x (now EOL, and no longer available to created in AWS Lambda) and Node.js 12.x
- Updated + tidied dependencies

---

## [6.2.2] 2021-06-04

### Changed

- Changed internal Inventory parameter from `PointInTimeRecovery` to `pitr` to support a cleaner Arc `@tables` option; fixes #1155
- Updated dependencies

---

## [6.2.1] 2021-04-23

### Added

- Moved and renamed helper method `createFunction` (formerly `createLambdaJSON`) for `@plugins` authors as export on main module export, it is now available at `require('@architect/package').createFunction`

---

## [6.2.0] 2021-03-02

### Added

- Added helper method `createLambdaJSON` for `@plugins` authors to help in defining CloudFormation-compatible Lambda definitions

---

## [6.1.0] 2021-03-02

### Added

- Added support for `name` property in `@indexes` pragma to allow explicit naming of GSIs; thanks @anatomic!

---

## [6.0.4] 2021-01-07

### Added

- Added ability for `@static` buckets – otherwise enabled by default – to be disabled with `@static false`


### Changed

- Updated dependencies

---

## [6.0.3] 2020-12-21

### Fixed

- Fixed regression where `@scheduled` functions may not fire; fixes #1040, thanks @alexbepple!
- Fixed issue where the static bucket url in the Cloudformation Output was wrong for newer AWS regions; thanks @thedersen

---

## [6.0.2] 2020-12-04

### Changed

- Updated dependencies


### Fixed

- Fixed issue where longer `@scheduled` function names would fail to deploy due to funky SAM transform behavior; thanks @gmartins, fixes #1038

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
