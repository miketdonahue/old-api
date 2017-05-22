/* eslint-disable global-require */
const defaultsDeep = require('lodash.defaultsdeep');

const config = {
  port: process.env.PORT || 8080,
  secrets: {
    jwt: 'secret',
  },
  expireTime: 60,
};

config.env = process.env.NODE_ENV || 'development';

let envConfig;
switch (config.env) {
  case 'development':
    envConfig = require('./development.js') || {};
    break;
  case 'test':
    envConfig = require('./development.js') || {};
    break;
  case 'production':
    envConfig = require('./development.js') || {};
    break;
  default:
    break;
}

module.exports = defaultsDeep(config, envConfig);
