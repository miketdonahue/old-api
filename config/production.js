const db = require('../knexfile');

module.exports = {
  database: db.production,
  server: {
    docs: false,
  },
};
