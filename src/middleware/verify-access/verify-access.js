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
    if (config.verifyAccess === false) return next();

    const user = objectPath.get(res.locals, 'user');
    const paramsUid = objectPath.get(req, 'params.uid');

    if (!user) {
      const serviceError = {
        name: 'UserNotFound',
        message: 'No user was found on res.locals',
        statusCode: 500,
      };

      return next(serviceError);
    }

    const permissions = getPermissions(user, resource, action, paramsUid);

    if (permissions.granted) {
      logger.info({ uid: user.uid }, 'VERIFY-ACCESS-MIDDLEWARE: Authorized');
      return next();
    }

    const serviceError = {
      name: 'Unauthorized',
      message: 'The user is not authorized for this resource',
      statusCode: 403,
      data: { user: 'User does not have access to perform this action' },
    };

    logger.warn(`VERIFY-ACCESS-MIDDLEWARE: ${serviceError.message}`);
    return next(serviceError);
  };
}

module.exports = verifyAccess;
