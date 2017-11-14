'use strict';
const Generator = require('yeoman-generator');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const _ = require('lodash');
const yaml = require('js-yaml');

module.exports = class extends Generator {
  initializing() {
    this.serverless = null;
    this.parentName = path.basename(process.cwd());
    this.props = {};
    try {
      this.serverless = yaml.safeLoad(fs.readFileSync(this.destinationPath('serverless.yml'), 'utf8'));
      this.log('Project detected, updating the core instead...');
    } catch (ex) {}
  }

  prompting() {
    return this.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your project name',
        default: () => {
          if (this.serverless) {
            return this.serverless.service;
          }
          return _.kebabCase(this.parentName + '-api');
        },
        filter: _.kebabCase
      },
      {
        type: 'input',
        name: 'region',
        default: () => {
          if (this.serverless) {
            return this.serverless.provider.region;
          }
          return 'us-east-2';
        },
        message: 'AWS API Gateway region'
      }
    ]).then(answers => {
      this.props = answers;
    });
  }

  defaults() {
    // Create new folder if not updating
    if (!this.serverless && path.basename(this.destinationPath()) !== this.props.name) {
      this.log(
        'Your generator must be inside a folder named ' + this.props.name + '\n' +
        'I\'ll automatically create this folder.'
      );
      mkdirp(this.props.name);
      this.destinationRoot(this.destinationPath(this.props.name));
    }
  }

  writing() {
    // Copy normal files/folders
    this.fs.copyTpl(
      this.templatePath(),
      this.destinationPath(),
      this.props
    );

    // Hidden files
    this.fs.copy(
      this.templatePath('.*'),
      this.destinationPath()
    );

    // Migrate .env vars
    this.fs.copy(
      this.templatePath('.env.yml.example'),
      this.destinationPath('.env.yml')
    );
  }

  install() {
    this.installDependencies({
      npm: true,
      bower: false
    });
  }
};
