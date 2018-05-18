const logger = require('local-logger');
const config = require('config');
const objectPath = require('object-path');
const getPermissions = require('./access');

/**
 * Verify access via RBAC
 *
 * @function
 * @param {String} action - the CRUD action being performed by the requested route
 * @param {String} resource - the name of the route resource
 * @returns {Function} - next() passes {err or null} to next middleware
 */
function verifyAccess(action, resource) {
  return (req, res, next) => {
    if (config.auth.verifyAccess === false) return next();

    const user = objectPath.get(req, 'user');
    const paramsUid = objectPath.get(req, 'params.uid');

    if (!user) {
      const appError = {
        name: 'AppError',
        message: 'No user was found at req.user',
        statusCode: '500',
        errors: [{
          statusCode: '500',
          message: 'No user was found at req.user',
          code: 'USER_NOT_FOUND',
          source: { path: 'data/user' },
        }],
      };

      logger.error({ response: appError }, `VERIFY-ACCESS-MIDDLEWARE: ${appError.message}`);
      return next(appError);
    }

    const permissions = getPermissions(user, resource, action, paramsUid);

    if (permissions.granted) {
      logger.info({ uid: user.uid }, 'VERIFY-ACCESS-MIDDLEWARE: Authorized');
      return next();
    }

    const appError = {
      name: 'AppError',
      message: 'The user is not authorized for this resource',
      statusCode: '403',
      errors: [{
        statusCode: '403',
        message: 'The user is not authorized for this resource',
        code: 'UNAUTHORIZED',
        source: { path: 'data/user' },
      }],
    };

    logger.warn({ response: appError }, `VERIFY-ACCESS-MIDDLEWARE: ${appError.message}`);
    return next(appError);
  };
}

module.exports = verifyAccess;
