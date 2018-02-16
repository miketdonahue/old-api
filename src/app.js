const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('config');
const formatError = require('local-error-formatter');
const logger = require('local-logger');
const requestLogger = require('middleware/request-logger');

const app = express();
const baseUrl = '/api';

// Global middleware
app.use('/public', express.static('public'));
app.use(helmet());
app.use(requestLogger());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:8080',
  optionsSuccessStatus: 200,
}));

// Route middleware
const verifyJwt = require('middleware/verify-jwt');

// Routes
const authRoutes = require('./api/auth/auth-routes');
const userRoutes = require('./api/users/users-routes');
const swaggerRoutes = require('./api/swagger/swagger-routes');

app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/users`, verifyJwt(), userRoutes);
app.use(`${baseUrl}/swagger`, verifyJwt(), swaggerRoutes);

// Handle unknown routes a.k.a. 404s
app.use((req, res, next) => { // eslint-disable-line no-unused-vars
  const serviceError = {
    name: 'UnknownRoute',
    message: 'Unknown route requested',
    statusCode: 404,
    data: { route: req.url },
  };

  const err = formatError(serviceError);

  logger.warn(`APP-MIDDLEWARE: ${err.message}`);
  return res.status(err.statusCode).json(err.jsonResponse);
});

// Error middleware
app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
  const err = formatError(error);

  return res.status(err.statusCode).json(err.jsonResponse);
});

// Start app
app.listen(config.server.port, () => {
  logger.info({
    port: config.server.port,
    env: process.env.NODE_ENV || 'development',
  }, 'Server has been started');
});

module.exports = app;
