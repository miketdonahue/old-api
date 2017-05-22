const express = require('express');
const morgan = require('morgan');
const config = require('../config/default');
const logger = require('./plugins/logger');

const authRoutes = require('./api/auth/routes');
const taskRoutes = require('./api/crud/routes');
const verifyUserMiddleware = require('./middleware/verify-jwt').verifyUser;

const app = express();

app.use(morgan('combined'));
app.use('/auth', verifyUserMiddleware(), authRoutes);
app.use('/tasks', taskRoutes);

// Error Middleware
app.use((err, req, res, next) => {
  // if (res.headersSent) {
  //   return next(err);
  // }

  return res.json({
    code: err.code,
    message: err.message,
  });
});

app.listen(config.port, () => {
  logger.info({
    port: config.port,
    env: config.env,
  }, 'Server has been started');
});
