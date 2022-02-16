# `@architect/package` [![GitHub CI status](https://github.com/architect/package/workflows/Node%20CI/badge.svg)](https://github.com/architect/package/actions?query=workflow%3A%22Node+CI%22)
<!-- [![codecov](https://codecov.io/gh/architect/package/branch/master/graph/badge.svg)](https://codecov.io/gh/architect/package) -->

[@architect/package][npm] packages @architect projects as [`AWS::Serverless`][sam]-compatible JSON. Converts Architect projects into a [AWS Serverless Application Model (SAM)][sam]-compatible format.

## Install

    npm i @architect/package

## API

All of this module's methods take as input an [@architect/inventory][inventory]-parsed Architect project.

### pkg(arc)

## Example Usage

```javascript
let inventory = require('@architect/inventory')
let pkg = require('@architect/package')

// fake out an .arc file as a string
let arcString = `
@app
mybasicapp

@http
get /
`

// export as sam
let inv = await inventory({ rawArc: arcString, deployStage: 'staging' })
let sam = pkg(inv)
console.log(sam)
```

[npm]: https://www.npmjs.com/package/@architect/package
[inventory]: https://www.npmjs.com/package/@architect/inventory
[sam]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-template.html
