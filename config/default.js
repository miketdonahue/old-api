const db = require('./databases');

module.exports = {
  server: {
    port: process.env.PORT || 8080,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expireTime: '1h',
  },
  database: db.development,
};
