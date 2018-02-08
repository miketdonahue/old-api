const db = require('./databases');

module.exports = {
  database: db.development,
  sendEmails: false,
  logger: {
    level: 'debug',
  },
};
