'use strict';
const {resolver, validate} = require('../generators/app/templates/helpers');

// eslint-disable-next-line
global.cb = (err, message) => message;

describe('helpers', () => {
  it('validate incorrect fields', () => {
    resolver.setRequired([
      'param1',
      'param2',
      'param3'
    ]);

    return expect(validate({})).rejects.toBeDefined();
  });

  it('validate correct fields', () => {
    resolver.setRequired([
      'param1',
      'param2',
      'param3'
    ]);

    return expect(validate({
      param1: 'value1',
      param2: 'value2',
      param3: 'value3'
    })).resolves.toBeUndefined();
  });

  xit('should generate a valid jwks-pem.json');
});
