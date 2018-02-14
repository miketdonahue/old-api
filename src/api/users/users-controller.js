const logger = require('local-logger');
const formatError = require('local-error-formatter');
const modelUtils = require('../../utils/utils');
const User = require('../../models').user;

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
  User.findAll({ order: [['last_name', 'ASC']], attributes: attrWhitelist })
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
  User.findOne({ where: { uid: req.params.uid }, attributes: attrWhitelist })
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
  const fieldsToUpdate = [];
  const body = {
    first_name: req.body.firstName,
    last_name: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
  };

  return User.findOne({ where: { uid: req.params.uid } })
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
      return user.comparePassword(body.password);
    })
    .then(({ isMatch, user }) => {
      if (isMatch) {
        body.password = undefined;
      }

      return { isMatch, user };
    })
    .then(({ isMatch, user }) => {
      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Preparing body');

      // Add fields to be updated to array
      Object.keys(body).forEach((key) => {
        if (body[key] !== undefined) fieldsToUpdate.push(key);
      });

      if (isMatch === false) {
        return user.hashPassword(req.body.password)
          .then((hash) => {
            body.password = hash;
            return user;
          });
      }

      return user;
    })
    .then(user => user.update(body, { fields: fieldsToUpdate }))
    .then((updatedUser) => {
      logger.info({ uid: updatedUser.uid }, 'USER-CTRL.UPDATE: Updated user');

      return res.json({
        status: 'success',
        data: { user: modelUtils.responseData(attrWhitelist, updatedUser) },
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
  User.findOne({ where: { uid: req.params.uid } })
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
      return user.destroy();
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
