const express = require('express');
const morganJson = require('morgan-json');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('config');
const logger = require('md-logger');
const ServiceError = require('verror');
const formatError = require('md-error-formatter');

const app = express();
const baseUrl = '/api';

// Global middleware
app.use('/public', express.static('public'));
app.use(helmet());
app.use(morgan(morganJson({
  date: ':date[clf]',
  httpVersion: 'HTTP/:http-version',
  method: ':method',
  referrer: ':referrer',
  remoteAddress: ':remote-addr',
  remoteUser: ':remote-user',
  reqHeader: ':req[header]',
  resHeader: ':res[header]',
  responseTime: ':response-time[3]',
  status: ':status',
  url: ':url',
  userAgent: ':user-agent',
})));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:8080',
  optionsSuccessStatus: 200,
}));

// Route middleware
const verifyJwt = require('./middleware/verify-jwt');
const authRoutes = require('./api/auth/routes');
const swaggerRoutes = require('./api/swagger/routes');

app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/swagger`, swaggerRoutes);

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

  logger.error({ error, err: error.stack }, `APP-MIDDLEWARE: ${error.message}`);
  return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
});

// Error middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const error = formatError(err);

  logger.error({ error, err: error.stack }, `APP-MIDDLEWARE: ${error.message}`);
  return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
});

// Start app
app.listen(config.server.port, () => {
  logger.info({
    port: config.server.port,
    env: process.env.NODE_ENV || 'development',
  }, 'Server has been started');
});
