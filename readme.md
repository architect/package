# `@architect/package`

Package `.arc` as `AWS::Serverless` compatible JSON

## install

```bash
npm i @architect/package
```

### example usage

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
