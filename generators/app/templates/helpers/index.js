const __async__ = require('asyncawait/async')
const __await__ = require('asyncawait/await')
const optionsResolver = require('options-resolver')
const response = require('./response')
const resolver = optionsResolver();

// apply validations using options resolver
let validate = __async__((event) => {
  __await__(resolver.resolve(event))
})

module.exports = { validate, resolver, response }
