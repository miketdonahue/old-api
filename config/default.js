const db = require('../knexfile');

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    docs: true,
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expireTime: '1h',
    },
    verifyAccess: true,
    confirmable: true,
    tokens: {
      passwordReset: {
        expireTime: 2, // time in hours
      },
      confirmed: {
        expireTime: 2, // time in hours
      },
    },
  },
  mailer: {
    sendEmails: true,
    domain: 'makeitcount.cc',
  },
  database: db.development,
};
