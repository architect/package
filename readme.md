# `@architect/package` [![Travis Build Status](https://travis-ci.com/architect/package.svg?branch=master)](https://travis-ci.com/architect/package) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/a7ycjsuku26adj4n/branch/master?svg=true)](https://ci.appveyor.com/project/ArchitectCI/package/branch/master) [![codecov](https://codecov.io/gh/architect/package/branch/master/graph/badge.svg)](https://codecov.io/gh/architect/package)

[@architect/package][npm] packages @architect projects as [`AWS::Serverless`][sam]
-compatible JSON. Converts project `.arc` files into a [AWS Serverless Application
Model (SAM)][sam]-compatible format.

## Install

    npm i @architect/package

## API

All of this module's methods take as input an [@architect/parser][parser]-parsed
@architect project `.arc` file.

### pkg(arc)

Depending on the size of your @architect project and its passed-in parsed `.arc`
file(the `arc` parameter), will invoke either [`toCFN`][toCFN] for larger projects
or [`toSAM`][toSAM] for smaller ones.

### pkg.toCFN(arc)

### pkg.toSAM(arc)

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
