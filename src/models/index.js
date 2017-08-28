const { Sequelize, DataTypes } = require('sequelize');
const config = require('config');

const dbUrl = `mysql://${config.database.username}:${config.database.password}@localhost:3306/${config.database.database}`;

const sequelize = new Sequelize(dbUrl, { logging: config.sqlLogging });

module.exports = {
  sequelize,
  DataTypes,
};
