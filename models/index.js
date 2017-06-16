const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('config');

const db = {};
const dbUrl = `mysql://${config.database.username}:${config.database.password}@localhost:3306/${config.database.database}`;

const sequelize = new Sequelize(dbUrl, { logging: config.sqlLogging });

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
