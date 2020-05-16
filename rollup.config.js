import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { version } from './package.json'

let browser = {
  input: 'src/esm.js',
  output: {
    file: `dist/architect-package-${version}.mjs`,
    format: 'esm'
  },
  plugins: [
    commonjs(), 
    json(), 
  ]
}

export default [browser]

