const db = require('../knexfile');

module.exports = {
  database: db.development,
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
    lockable: {
      maxAttempts: 5,
    },
    securityQuestions: true,
    tokens: {
      // Expire time is in minutes
      passwordReset: {
        expireTime: 15,
      },
      confirmed: {
        expireTime: 360, // 6 hrs
      },
      unlockAccount: {
        expireTime: 15,
      },
    },
  },
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
  },
  mailer: {
    sendEmails: true,
    domain: 'makeitcount.cc',
  },
  graphql: {
    debug: true,
  },
};
