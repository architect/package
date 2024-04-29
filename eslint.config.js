const arc = require('@architect/eslint-config')

module.exports = [
  ...arc,
  {
    ignores: [
      '.nyc_output/',
      'coverage/',
      'test/slow/mock/',
      'vendor/arc-proxy-*',
    ],
  },
]
