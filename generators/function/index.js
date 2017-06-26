'use strict';
const Generator = require('yeoman-generator');
const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

module.exports = class extends Generator {
  initializing() {
    this.currentDir = path.basename(process.cwd());
    this.props = {};
    try {
      fs.statSync(this.destinationPath('serverless.yml'));
    } catch (ex) {
      this.log.error('serverless.yml N  OT FOUND, for overwrite go inside a project.');
    }
  }

  prompting() {
    return this.prompt([
      {
        type: 'confirm',
        name: 'nested',
        message: 'Is it a nested resource?',
        default: false
      },
      {
        type: 'list',
        name: 'method',
        message: 'Which HTTP method?',
        choices: ['GET', 'POST', 'PUT', 'DELETE']
      },
      {
        type: 'input',
        name: 'name',
        message: 'Resource name',
        filter: _.kebabCase,
        validate: value => {
          return !_.isEmpty(value);
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Your function description',
        default: answers => {
          let name = (answers.nested) ? `${this.currentDir} ${answers.name}` : answers.name;
          return `${_.capitalize(answers.method)} ${name}`;
        }
      }
    ]).then(answers => {
      this.props = answers;
    });
  }

  writing() {
    let name = `${this.props.method}-`;
    let method = _.toLower(this.props.method);
    let folder = 'functions/';

    // Append parent name, folder name nested
    if (this.props.nested) {
      name += `${this.currentDir}-`;
      folder = '';
    }
    name += `${this.props.name}`;
    name = _.toLower(name);
    folder += this.props.name;

    try {
      // Build the configuration file
      let serverless = yaml.safeLoad(fs.readFileSync(this.destinationPath('serverless.yml'), 'utf8'));
      serverless.functions[name] = {
        name,
        description: this.props.description,
        handler: `${folder}/${method}.handler`,
        events: [
          {
            http: {
              method: _.toUpper(method),
              path: this.props.name,
              integration: 'lambda',
              request: {
                // eslint-disable-next-line
                template: '${file("templates/request.vtl")}'
              }
            }
          }
        ]
      };

      fs.writeFile(
        this.destinationPath('serverless.yml'),
        yaml.safeDump(serverless),
        () => this.log.ok(`Function "${name}" generated successfully`)
      );
    } catch (ex) {
      this.log.error('Could not read/write serverless.yml file.');
    }

    // Create function handler
    mkdirp(folder);
    this.fs.copyTpl(
      this.templatePath('handler.js'),
      this.destinationPath(`${folder}/${method}.js`),
      {name, method}
    );
  }
};
