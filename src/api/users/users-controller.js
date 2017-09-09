const logger = require('local-logger');
const ServiceError = require('verror');
const formatError = require('local-error-formatter');
const modelUtils = require('../../models/utils');
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
 * @description All users found will be listed by last name in ASC order
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const list = (req, res) => {
  User.findAll({ order: [['last_name', 'ASC']], attributes: attrWhitelist })
    .then((users) => {
      if (!users) {
        const serviceError = new ServiceError({
          name: 'NoUsersFound',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { users: 'No users were found' },
          },
        }, 'No users exist or the query is incorrect');

        throw (serviceError);
      }

      logger.info('USER-CTRL.LIST: Listing all users');
      return res.json({ status: 'success', data: { users } });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `USER-CTRL.LIST: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Show a specific user
 *
 * @description Given a user UID a whitelist of attributes will be sent for that user
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const show = (req, res) => {
  User.findOne({ where: { uid: req.params.uid }, attributes: attrWhitelist })
    .then((user) => {
      if (!user) {
        const serviceError = new ServiceError({
          name: 'UserNotFound',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { user: 'No user found with specified uid' },
          },
        }, `No user was found with uid: ${req.params.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.SHOW: Retrieving user');
      return res.json({ status: 'success', data: { user } });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `USER-CTRL.SHOW: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Update a specific user
 *
 * @description Will update a user given a UID; Whitelist of body attributes
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

  User.findOne({ where: { uid: req.params.uid } })
    .then((user) => {
      if (!user) {
        const serviceError = new ServiceError({
          name: 'UserNotFound',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { user: 'No user found with specified uid' },
          },
        }, `No user was found with uid: ${req.params.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Updating user');

      return user.comparePassword(req.body.password)
        .then((isMatch) => {
          if (isMatch) {
            body.password = undefined;
          }

          return { user, isMatch };
        });
    })
    .then((userData) => {
      const { user } = userData;
      const passwordMatch = userData.isMatch;

      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Preparing body');

      // Add fields to be updated to array
      Object.keys(body).forEach((key) => {
        if (body[key] !== undefined) fieldsToUpdate.push(key);
      });

      if (!passwordMatch) {
        return user.hashPassword(req.body.password)
          .then((hash) => {
            user.password = hash;
            return user.save(fieldsToUpdate);
          });
      }

      return user.save(fieldsToUpdate);
    })
    .then((user) => {
      logger.info({ uid: user.uid }, 'USER-CTRL.UPDATE: Updated user');

      return res.json({
        status: 'success',
        data: { user: modelUtils.responseData(attrWhitelist, user) },
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `USER-CTRL.UPDATE: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Delete a specific user
 *
 * @description Sets deleted_at field to a date
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const destroy = (req, res) => {
  User.findOne({ where: { uid: req.params.uid } })
    .then((user) => {
      if (!user) {
        const serviceError = new ServiceError({
          name: 'UserNotFound',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { user: 'No user found with specified uid' },
          },
        }, `No user was found with uid: ${req.params.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'USER-CTRL.DESTROY: Attempting to delete user');
      return user.destroy();
    })
    .then((deletedUser) => {
      logger.info({ uid: deletedUser.uid }, 'USER-CTRL.DESTROY: Deleted user');

      return res.json({
        status: 'success',
        data: { user: modelUtils.responseData(attrWhitelist, deletedUser) },
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `USER-CTRL.DESTROY: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

module.exports = {
  list,
  show,
  update,
  destroy,
};
