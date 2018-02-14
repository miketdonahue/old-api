const logger = require('local-logger');

/**
 * Logs key information on every request
 *
 * @function
 * @returns {String} - Log line
 */
function requestLogger() {
  return (req, res, next) => {
    const startTime = process.hrtime();
    const originalResEnd = res.end;

    logger.info({
      req,
      res,
    }, 'start request');

    res.end = (...args) => {
      const diffTime = process.hrtime(startTime);
      const responseTime = ((diffTime[0] * 1e9) + diffTime[1]) / 1e6;

      logger.info({
        responseTime: `${responseTime} ms`,
      }, 'end request');

      originalResEnd.apply(res, args);
    };

    next();
  };
}

module.exports = requestLogger;
