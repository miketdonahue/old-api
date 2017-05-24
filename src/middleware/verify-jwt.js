const jwt = require('jsonwebtoken');
const config = require('config');
const logger = require('md-logger');

// TODO: Want to implement refresh token?

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

function verifyJwt(options) {
  return (req, res, next) => {
    if (!options.skipPaths.includes(req.path)) {
      const token = getTokenFromHeader(req.headers);

      jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
          next(err);
        } else {
          logger.info('VERIFY-JWT-MIDDLEWARE: Returning decoded token');
          next(null, decoded);
        }
      });
    } else {
      logger.info('VERIFY-JWT-MIDDLEWARE: Skipping JWT verification based on skipPaths');
      next();
    }
  };
}

module.exports = verifyJwt;
