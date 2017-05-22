const bunyan = require('bunyan');

const logger = bunyan.createLogger({
  name: 'myapp',
});

module.exports = logger;
