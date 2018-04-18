const path = require('path');

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'node_api_development',
    },
    migrations: {
      tableName: 'migrations',
      directory: path.join(process.cwd(), '/migrations'),
    },
    seeds: {
      directory: path.join(process.cwd(), '/seeders'),
    },
    debug: true,
  },
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'node_api_test',
    },
    migrations: {
      tableName: 'migrations',
      directory: path.join(process.cwd(), '/migrations'),
    },
    seeds: {
      directory: path.join(process.cwd(), '/seeders'),
    },
    debug: false,
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'node_api_production',
    },
    debug: false,
  },
};
