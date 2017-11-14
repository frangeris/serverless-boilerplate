'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

describe('serverless-boilerplate:function', () => {
  beforeEach(done => {
    helpers
      .run(path.join(__dirname, '../generators/func'), {
        tmpir: false
      })
      .withPrompts({
        name: 'users',
        method: 'get',
        nested: 'Normal "/users"'
      })
      .withGenerators([
        [helpers.createDummyGenerator(), '../generators/app']
      ])
      .on('end', done);
  });

  it('generate GET method', () => {
    assert.file('functions/users/get.js');
  });

  xit('generate a nested method');
  xit('generate a method by id');

  // File serverless.yml do not exists
  xit('generate a valid serverless.yml');
  xit('must enable cors');
});
