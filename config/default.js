const db = require('./databases');

module.exports = {
  server: {
    port: process.env.PORT || 8080,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expireTime: '1h',
  },
  sendEmails: true,
  tokens: {
    passwordReset: {
      expireTime: 2, // time in hours
    },
    confirmed: {
      expireTime: 2, // time in hours
    },
  },
  database: db.development,
  sqlLogging: console.log, // eslint-disable-line no-console
};
