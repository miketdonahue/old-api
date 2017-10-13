const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');

/**
 * Retrieve the Bearer authorization token from the header
 *
 * @description Formats application errors according to type
 * @function
 * @param {Object} error - Express.js err
 * @returns {Object} - Formatted error object to be passed to local-logger
 */
function getTokenFromHeader(headers) {
  const headerParts = (headers.authorization && headers.authorization.split(' ')) || [];
  let token;

  if (headerParts.length === 2) {
    const scheme = headerParts[0];
    const credentials = headerParts[1];

    if (/^Bearer$/i.test(scheme)) {
      token = credentials;
    }
  }

  return token;
}

/**
 * Application error formatter
 *
 * @description Formats application errors according to type
 * @function
 * @param {Object} error - Express.js err
 * @returns {Object} - Formatted error object to be passed to local-logger
 */
function verifyJwt() {
  return (req, res, next) => {
    if (config.jwt === false) return next();

    const token = getTokenFromHeader(req.headers);

    return jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        logger.warn(`VERIFY-JWT-MIDDLEWARE: ${err.message}`);
        return next(err);
      }

      logger.info('VERIFY-JWT-MIDDLEWARE: Returning token');

      res.locals.user = decoded;
      return next();
    });
  };
}

module.exports = verifyJwt;
