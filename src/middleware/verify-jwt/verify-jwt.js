const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');

/**
 * Retrieve the Bearer authorization token from the header
 *
 * @function
 * @param {Object} headers - Request headers
 * @returns {Object} - token
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
 * Determines the error attributes to be returned
 *
 * @function
 * @param {Object} err - Express.js err
 * @returns {Object} - Formatted error object
 */
function determineError(err) {
  const serviceError = {
    name: err.name,
    message: err.message,
    data: { jwt: err.message },
  };

  switch (err.message) {
    case 'jwt expired':
      serviceError.statusCode = 401;
      serviceError.data = { jwt: `Token expired at ${err.expiredAt}` };
      break;
    case 'jwt signature is required':
      serviceError.statusCode = 401;
      serviceError.data = { jwt: 'No token provided with request' };
      break;
    case 'jwt malformed':
      serviceError.statusCode = 400;
      break;
    case 'invalid signature':
      serviceError.statusCode = 400;
      break;
    default:
      serviceError.statusCode = 500;
      break;
  }

  return serviceError;
}

/**
 * Verifies the JWT and returns it or throws an error
 *
 * @function
 * @returns {Object} - Formatted error object to be passed to local-logger
 */
function verifyJwt() {
  return (req, res, next) => {
    if (config.jwt === false) return next();

    const token = getTokenFromHeader(req.headers);

    return jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        const serviceError = determineError(err);

        logger.warn(`VERIFY-JWT-MIDDLEWARE: ${err.message}`);
        return next(serviceError);
      }

      logger.info('VERIFY-JWT-MIDDLEWARE: Returning token');

      res.locals.user = decoded;
      return next();
    });
  };
}

module.exports = verifyJwt;
