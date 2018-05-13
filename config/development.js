const db = require('../knexfile');

module.exports = {
  database: db.development,
  auth: {
    jwt: false,
    verifyAccess: false,
  },
  mailer: {
    sendEmails: false,
  },
  logger: {
    level: 'debug',
  },
};
