const db = require('./databases');

module.exports = {
  database: db.test,
  server: {
    port: 9000,
  },
  auth: {
    jwt: false,
    verifyAccess: false,
  },
  mailer: {
    sendEmails: false,
  },
};
