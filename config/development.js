const db = require('./databases');

module.exports = {
  database: db.development,
  mailer: {
    sendEmails: false,
  },
  logger: {
    level: 'debug',
  },
};
