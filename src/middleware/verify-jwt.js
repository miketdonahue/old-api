const jwt = require('jsonwebtoken');
const config = require('config');
const logger = require('local-logger');

// TODO: Want to implement refresh token?

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
    const token = getTokenFromHeader(req.headers);

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        next(err);
      } else {
        logger.info('VERIFY-JWT-MIDDLEWARE: Returning token');
        next(null, decoded);
      }
    });
  };
}

module.exports = verifyJwt;
