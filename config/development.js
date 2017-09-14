const db = require('./databases');

module.exports = {
  database: db.development,
  transactionalEmails: false,
  logger: {
    level: 'debug',
  },
};
