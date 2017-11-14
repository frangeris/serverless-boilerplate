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
        message: 'Resource name',
        filter: _.kebabCase.toLower,
        validate: value => {
          return !_.isEmpty(value);
        }
      },
      {
        type: 'list',
        name: 'nested',
        message: 'What kind of design?',
        choices: answers => {
          return [
            `Normal "/${answers.name}"`,
            `By id "/${answers.name}/{id}"`,
            `Nested "/${this.currentDir}/{id}/${answers.name}"`
          ];
        }
      },
      {
        type: 'list',
        name: 'method',
        message: 'Which HTTP method?',
        choices: answers => {
          let disabled = answers.nested.match(/By id/);
          return [
            {name: 'GET', disabled: false},
            {name: 'POST', disabled},
            {name: 'PUT', disabled: false},
            {name: 'DELETE', disabled: false}
          ];
        },
        filter: _.toLower
      },
      {
        type: 'input',
        name: 'description',
        message: 'Your function description',
        default: answers => {
          let name = (answers.nested.match(/Nested/)) ? `${this.currentDir} ${answers.name}` : answers.name;
          let byId = (answers.nested.match(/By id/)) ? ' by id' : '';
          return `${_.capitalize(answers.method)} ${name}${byId}`;
        }
      }
    ]).then(answers => {
      this.props = answers;
    });
  }

  writing() {
    let method = `${this.props.method}`;
    let handler = 'functions/';
    let filename = method;
    let lambda = `${method}`;
    let dest = handler;

    // If file name just when GET by id
    if (method === 'get' && this.props.nested.match(/By id/)) {
      filename = 'id';
    }

    // Build the configuration file
    if (this.props.nested.match(/By id/)) {
      dest += this.props.name;
    } else if (this.props.nested.match(/Nested/)) {
      // Nested
      lambda += `-${this.currentDir}`;
      handler += `${this.currentDir}/`;
      dest = this.props.name;
    } else {
      dest += this.props.name;
    }

    // Final name of lambda function & handler
    handler += this.props.name;
    lambda += `-${this.props.name}`;
    if (method === 'get' && this.props.nested.match(/By id/)) {
      lambda += '-id';
    }
    handler += `/${filename}.handler`;

    try {
      // Substract the url path
      let nestedPath = this.props.nested.match(`"(.*)"`);
      let urlPath = nestedPath ? nestedPath[1] : this.props.name;

      // Start overwrite config file
      let serverless = yaml.safeLoad(fs.readFileSync(this.configFile, 'utf8'));
      let http = {
        method: _.toUpper(this.props.method),
        path: urlPath
      };

      // Enable cors by default
      http.cors = true;

      serverless.functions[lambda] = {
        name: `${serverless.service}-${lambda}`,
        description: this.props.description,
        handler,
        events: [
          {
            http
          }
        ]
      };

      fs.writeFile(
        this.configFile,
        yaml.safeDump(serverless),
        () => this.log.ok(`${_.toUpper(method)} ${urlPath} for "${lambda}" function generated successfully`)
      );
    } catch (ex) {
      this.log.error('Could not read/write serverless.yml file.');
    }

    // Create function handler
    mkdirp(dest);
    this.fs.copyTpl(
      this.templatePath('handler.js'),
      this.destinationPath(`${dest}/${filename}.js`),
      {
        lambda,
        method,
        path: (this.props.nested.match(/Nested/)) ? '../../..' : '../..'
      }
    );
  }
};
