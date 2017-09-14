module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'teach_development',
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'teach_test',
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'teach_production',
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
};
