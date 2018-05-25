const db = require('../knexfile');

module.exports = {
  database: db.development,
  auth: {
    // jwt: true,
    verifyAccess: false,
  },
  contentSecurityPolicy: {
    // These are for the graphiql interface at /api/docs
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'unpkg.com', 'cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
    fontSrc: ["'self'", 'data:'],
    imgSrc: ["'self'", 'data:'],
  },
  mailer: {
    sendEmails: false,
  },
  logger: {
    level: 'debug',
  },
};
