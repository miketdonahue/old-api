const logger = require('local-logger');
const objectPath = require('object-path');
const ServiceError = require('verror');
const getPermissions = require('./access');

/**
 * Verify access via RBAC
 *
 * @description Ensure a user has access to the resource requested based on their role
 * @function
 * @param {String} action - the CRUD action being performed by the requested route
 * @param {String} resource - the name of the route resource
 * @returns {Function} - next() passes {err or null} to next middleware
 */
function verifyAccess(action, resource) {
  return (req, res, next) => {
    const user = objectPath.get(res.locals, 'user');
    const paramsUid = objectPath.get(req, 'params.uid');

    if (!user) {
      return next(new ServiceError({
        name: 'UserNotFound',
        info: {
          statusCode: 500,
          statusText: 'fail',
        },
      }, 'No user was found on res.locals'));
    }

    const permissions = getPermissions(user, resource, action, paramsUid);

    if (permissions.granted) {
      logger.info({ uid: user.uid }, 'VERIFY-ACCESS-MIDDLEWARE: Authorized');
      return next();
    }

    const error = new ServiceError({
      name: 'Unauthorized',
      info: {
        statusCode: 403,
        statusText: 'fail',
        data: { user: 'User does not have access to perform this action' },
      },
    }, `User is not authorized for this resource: ${user.uid}`);

    logger.warn({ err: error }, `VERIFY-ACCESS-MIDDLEWARE: ${error.message}`);
    return next(error);
  };
}

module.exports = verifyAccess;
