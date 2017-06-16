const db = require('./databases');

module.exports = {
  database: db.production,
  sqlLogging: false,
};
