const logger = require('local-logger');
const formatError = require('local-error-formatter');
const utils = require('local-app-utils');
const User = require('../../models/user');

const attrWhitelist = [
  'uid',
  'first_name',
  'last_name',
  'email',
  'last_visit',
  'created_at',
  'updated_at',
  'deleted_at',
];

/**
 * List all users
 *
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const list = (req, res) =>
  User.knex()
    .whereNull('deleted_at')
    .orderBy('last_name', 'asc')
    .select(attrWhitelist)
    .then((users) => {
      if (!users.length) {
        const serviceError = {
          name: 'NoUsersFound',
          message: 'No users exist',
          statusCode: 400,
          data: { users: 'No users were found' },
        };

        throw (serviceError);
      }

      logger.info('USER-CTRL.LIST: Listing all users');

      return res.json({ status: 'success', data: { users } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `USER-CTRL.LIST: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });

/**
 * Show a specific user
 *
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const show = (req, res) =>
  User.knex()
    .where({
      uid: req.params.uid,
      deleted_at: null,
    })
    .first()
    .select(attrWhitelist)
    .then((user) => {
      if (!user) {
        const serviceError = {
          name: 'UserNotFound',
          message: 'No user was found',
          statusCode: 400,
          data: { uid: 'The UID was not found' },
        };

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.SHOW: Retrieving user');

      return res.json({ status: 'success', data: { user } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `USER-CTRL.SHOW: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });

/**
 * Update a specific user
 *
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const update = (req, res) => {
  const body = {
    first_name: req.body.firstName,
    last_name: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
  };

  return User.knex()
    .where({
      uid: req.params.uid,
      deleted_at: null,
    })
    .first()
    .then((user) => {
      if (!user) {
        const serviceError = {
          name: 'UserNotFound',
          message: 'No user was found',
          statusCode: 400,
          data: { uid: 'The UID was not found' },
        };

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Updating user');

      if (!body.password) return { user };
      return User.comparePassword(user, req.body.password);
    })
    .then(({ isMatch, user }) => {
      if (isMatch === false) {
        return User.hashPassword(user, req.body.password);
      }

      return { hashedPassword: null, user };
    })
    .then(({ hashedPassword, user }) => {
      const clonedBody = Object.assign({}, body);

      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Determining values to update');

      if (hashedPassword) {
        clonedBody.password = hashedPassword;
      } else {
        clonedBody.password = undefined;
      }

      return User.update(user, clonedBody);
    })
    .then((updatedUser) => {
      logger.info({ uid: updatedUser.uid }, 'USER-CTRL.UPDATE: Updated user');

      return res.json({
        status: 'success',
        data: { user: utils.models.responseData(attrWhitelist, updatedUser) },
      });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `USER-CTRL.UPDATE: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });
};

/**
 * Delete a specific user
 *
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const destroy = (req, res) =>
  User.knex()
    .where({
      uid: req.params.uid,
      deleted_at: null,
    })
    .first()
    .then((user) => {
      if (!user) {
        const serviceError = {
          name: 'UserNotFound',
          message: 'No user was found',
          statusCode: 400,
          data: { uid: 'The UID was not found' },
        };

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.DESTROY: Attempting to delete user');

      return User.update(user, {
        deleted_at: new Date(),
      });
    })
    .then((deletedUser) => {
      logger.info({ uid: deletedUser.uid }, 'USER-CTRL.DESTROY: Deleted user');

      return res.json({
        status: 'success',
        data: null,
      });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `USER-CTRL.DESTROY: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });

module.exports = {
  list,
  show,
  update,
  destroy,
};
