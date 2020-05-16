# `@architect/package` [![GitHub CI status](https://github.com/architect/package/workflows/Node%20CI/badge.svg)](https://github.com/architect/package/actions?query=workflow%3A%22Node+CI%22)
<!-- [![codecov](https://codecov.io/gh/architect/package/branch/master/graph/badge.svg)](https://codecov.io/gh/architect/package) -->

[@architect/package][npm] converts OpenJS Architect project `.arc` files into a [AWS Serverless Application
Model (SAM) CloudFormation][sam].

## Install

    npm i @architect/package

## Example Usage

```javascript
let parse = require('@architect/parser')
let pkg = require('@architect/package')

// fake out an .arc file as a string
let arcString = `
@app
mybasicapp

@http
get /
`

// parse .arc string into a plain javascript object
let arc = parse(arcString)

// export as sam
let sam = pkg(arc)
console.log(sam)
```

[toCFN]: #pkgtoCFNarc
[toSAM]: #pkgtoSAMarc
[npm]: https://www.npmjs.com/package/@architect/package
[parser]: https://www.npmjs.com/package/@architect/parser
[sam]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-template.html
