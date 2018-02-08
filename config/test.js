const db = require('./databases');

module.exports = {
  database: db.test,
  server: {
    port: 9000,
  },
  jwt: false,
  verifyAccess: false,
  sendEmails: false,
};
