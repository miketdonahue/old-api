// For better local node_module paths (i.e. require('local-module'))
require('app-module-path').addPath(__dirname);

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('config');
const formatError = require('local-error-handler');
const logger = require('local-logger');
const requestLogger = require('middleware/request-logger');
const healthCheck = require('express-healthcheck');

const app = express();
const baseUrl = '/api';

// Security Headers
app.use(helmet());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
  },
}));

// Global middleware
app.use('/public', express.static('public'));
app.use('/health-check', healthCheck());
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
const mailerRoutes = require('./api/mailer/mailer-routes');
const userRoutes = require('./api/users/users-routes');
const paymentRoutes = require('./api/payments/payments-routes');

app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/mailer`, mailerRoutes);
app.use(`${baseUrl}/users`, verifyJwt(), userRoutes);
app.use(`${baseUrl}/payments`, verifyJwt(), paymentRoutes);

// Handle unknown routes (404s)
app.use((req, res, next) => { // eslint-disable-line no-unused-vars
  const appError = {
    name: 'AppError',
    message: 'Unknown route requested',
    statusCode: '404',
    errors: [{
      statusCode: '404',
      message: 'Unknown route requested',
      code: 'UNKNOWN_ROUTE',
      meta: { route: req.url },
    }],
  };

  const err = formatError(appError);

  logger.warn({ response: appError }, `APP-MIDDLEWARE: ${err.message}`);
  return res.status(err.statusCode).json({ errors: err.jsonResponse });
});

// Error middleware
app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
  const err = formatError(error);

  logger.error({ err: error, response: err }, `APP-MIDDLEWARE: ${err.message}`);
  return res.status(err.statusCode).json({ errors: err.jsonResponse });
});

// Start app
app.listen(config.server.port, () => {
  logger.info({
    port: config.server.port,
    env: process.env.NODE_ENV || 'development',
  }, 'Server has been started');
});

module.exports = app;
