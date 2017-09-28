const db = require('./databases');

module.exports = {
  database: db.test,
  server: {
    port: 9000,
  },
  jwt: false,
  verifyAccess: false,
  transactionalEmails: false,
};
