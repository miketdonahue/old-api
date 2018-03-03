const path = require('path');
const fs = require('fs');
const Sequelize = require('sequelize');
const config = require('config');

const db = {};
const basename = path.basename(module.filename);
const dbUrl = `mysql://${config.database.username}:${config.database.password}@localhost:3306/${config.database.database}`;

const sequelize = new Sequelize(dbUrl, { logging: config.database.sqlLogging });

fs
  .readdirSync(__dirname)
  .filter(file =>
    (file.indexOf('.') !== 0) &&
    (file !== basename) &&
    (file !== 'utils.js') &&
    (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
