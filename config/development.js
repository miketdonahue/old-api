const db = require('./databases');

module.exports = {
  database: {
    database: db.development.database,
  },
};
