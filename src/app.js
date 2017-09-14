const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('config');
const ServiceError = require('verror');
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
const mailerRoutes = require('./api/mailer/mailer-routes');
const swaggerRoutes = require('./api/swagger/swagger-routes');

app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/users`, verifyJwt(), userRoutes);
app.use(`${baseUrl}/mailer`, verifyJwt(), mailerRoutes);
app.use(`${baseUrl}/swagger`, verifyJwt(), swaggerRoutes);

// Handle unknown routes a.k.a. 404s
app.use((req, res, next) => { // eslint-disable-line no-unused-vars
  const serviceError = new ServiceError({
    name: 'UnknownRoute',
    info: {
      statusCode: 404,
      statusText: 'fail',
      data: [],
    },
  }, 'Unknown route requested');

  const error = formatError(serviceError);

  logger.info({ error, err: error.stack }, `APP-MIDDLEWARE: ${error.message}`);
  return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
});

// Error middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const error = formatError(err);

  return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
});

// Start app
app.listen(config.server.port, () => {
  logger.info({
    port: config.server.port,
    env: process.env.NODE_ENV || 'development',
  }, 'Server has been started');
});
