const db = require('../knexfile');

module.exports = {
  database: db.development,
  mailer: {
    sendEmails: false,
  },
  logger: {
    level: 'debug',
  },
};
