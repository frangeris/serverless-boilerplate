'use strict';
const Generator = require('yeoman-generator');
const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const glob = require('glob');

module.exports = class extends Generator {
  initializing() {
    this.currentDir = path.basename(process.cwd());
    this.props = {};

    // Find conf file
    let locate = () => {
      let files = glob.sync('{./,../,../../,../../../}/serverless.yml', {
        nodir: true,
        realpath: true
      });

      if (!files) {
        this.log.error('serverless.yml NOT FOUND, for overwrite go inside a project.');
      }

      return files ? files[0] : './';
    };

    this.configFile = locate();
  }

  prompting() {
    return this.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Function name',
        filter: _.kebabCase.toLower,
        validate: value => {
          return !_.isEmpty(value);
        }
      },
      {
        type: 'list',
        name: 'method',
        message: 'Which HTTP method?',
        choices: ['GET', 'POST', 'PUT', 'DELETE'],
        filter: _.toLower
      },
      {
        type: 'confirm',
        name: 'nested',
        message: 'Is it a nested resource?',
        default: false
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
    let func = `${this.props.method}`;
    let dest = 'functions/';
    let handler = '';

    // Append parent name, folder name nested
    if (this.props.nested) {
      func += `-${this.currentDir}`;
      dest = '';
    }
    let name = _.toLower(`${func}-${this.props.name}`);
    dest += this.props.name;

    try {
      // Build the configuration file
      if (this.props.nested) {
        handler = 'functions/';
        handler += `${this.currentDir}/`;
      }
      handler += `${dest}/${this.props.method}.handler`;
      let serverless = yaml.safeLoad(fs.readFileSync(this.configFile, 'utf8'));
      serverless.functions[name] = {
        name,
        description: this.props.description,
        handler,
        events: [
          {
            http: {
              method: _.toUpper(this.props.method),
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
        this.configFile,
        yaml.safeDump(serverless),
        () => this.log.ok(`Function "${name}" generated successfully`)
      );
    } catch (ex) {
      this.log.error('Could not read/write serverless.yml file.');
    }

    // Create function handler
    mkdirp(dest);
    this.fs.copyTpl(
      this.templatePath('handler.js'),
      this.destinationPath(`${dest}/${this.props.method}.js`),
      {
        name,
        method: this.props.method
      }
    );
  }
};
