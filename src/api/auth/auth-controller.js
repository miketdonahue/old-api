const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const momentDate = require('moment');
const md5 = require('md5');
const ServiceError = require('verror');
const formatError = require('local-error-formatter');
const emailClient = require('local-mailer');
const User = require('../../models/user');

/**
 * User signup flow
 *
 * @description Creates a new user; Sends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const signup = (req, res) => {
  User.findOne({ where: { email: req.body.email } })
    .then((user) => {
      if (!user) {
        logger.info('AUTH-CTRL.SIGNUP: Creating new user');

        return User.create({
          email: req.body.email,
          first_name: req.body.firstName,
          last_name: req.body.lastName,
          password: req.body.password,
          last_visit: momentDate(),
          ip: req.ip,
        }, {
          fields: ['uid', 'first_name', 'last_name', 'email', 'password', 'last_visit', 'ip', 'confirmed_token', 'confirmed_expires'],
        });
      }

      return null;
    })
    .then((user) => {
      if (user) {
        emailClient.sendConfirmMail(user);

        logger.info({ uid: user.uid }, 'AUTH-CTRL.SIGNUP: User created');
        return res.status(201).json({
          status: 'success',
          data: { user: { id: user.uid } },
        });
      }

      const serviceError = new ServiceError({
        name: 'UserExists',
        info: {
          statusCode: 400,
          statusText: 'fail',
          data: { email: 'A user with this email has already been created' },
        },
      }, 'Duplicate user');

      throw (serviceError);
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL.SIGNUP: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * User confirm account flow
 *
 * @description Ensures token not expired; Updates token attributes; Logs in user
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const confirmAccount = (req, res) => {
  const { confirmToken } = req.query;

  User.findOne({ where: { confirmed_token: confirmToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.confirmed_expires < momentDate();

      if (!user || tokenExpired) {
        const serviceError = new ServiceError({
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          info: {
            statusCode: 403,
            statusText: 'fail',
            data: { user: 'A user does not exist for the given token or token expired' },
          },
        }, `No user found with given token or token expired: ${user.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Confirming user\'s account');

      user.confirmed = true;
      user.confirmed_token = null;
      user.confirmed_expires = null;
      return user.save(['confirmed', 'confirmed_token', 'confirmed_expires']);
    })
    .then((updatedUser) => {
      logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Account was confirmed');

      jwt.sign({
        id: updatedUser.uid,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime }, (e, token) => {
        if (e) {
          const error = formatError(e);

          logger.error({ error, err: error.stack }, `AUTH-CTRL.CONFIRM-ACCOUNT: ${error.message}`);
          return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
        }

        emailClient.sendWelcomeMail(updatedUser);

        logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Logging in user');
        return res.json({ status: 'success', data: { token } });
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL.CONFIRM-ACCOUNT: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * User login flow
 *
 * @description Ensures user is confirmed; Checks credentials; Updates attributes; Logs in the user
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const login = (req, res) => {
  User.findOne({ where: { email: req.body.email } })
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        const serviceError = new ServiceError({
          name: (!user) ? 'EmailNotFound' : 'EmailNotConfirmed',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { email: (!user) ? 'Email does not exist' : 'Email is not confirmed' },
          },
        }, `Email does not exist or user email is not confirmed: ${user.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.LOGIN: Found user');
      return user;
    })
    .then((obj) => {
      const user = obj;

      return user.comparePassword(req.body.password)
        .then((isMatch) => {
          if (!isMatch) {
            const serviceError = new ServiceError({
              name: 'InvalidCredentials',
              info: {
                statusCode: 400,
                statusText: 'fail',
                data: { password: 'Password does not match' },
              },
            }, `User password does not match DB: ${user.uid}`);

            throw (serviceError);
          }

          logger.info({ uid: user.uid }, 'AUTH-CTRL.LOGIN: Updating user attributes');

          user.last_visit = momentDate();
          user.ip = req.ip;
          return user.save(['last_visit', 'ip']);
        });
    })
    .then((updatedUser) => {
      jwt.sign({
        id: updatedUser.uid,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime }, (e, token) => {
        if (e) {
          const error = formatError(e);

          logger.error({ error, err: error.stack }, `AUTH-CTRL.LOGIN: ${error.message}`);
          return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
        }

        logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.LOGIN: Logging in user');
        return res.json({ status: 'success', data: { token } });
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL.LOGIN: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * User forgot password flow
 *
 * @description Ensure user is confirmed; Generate reset password attributes; Send email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const forgotPassword = (req, res) => {
  User.findOne({ where: { email: req.body.email } })
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        const serviceError = new ServiceError({
          name: (!user) ? 'EmailNotFound' : 'EmailNotConfirmed',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { email: (!user) ? 'Email does not exist' : 'Email is not confirmed' },
          },
        }, `Email does not exist or user email is not confirmed: ${user.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.FORGOT-PASSWORD: Found user');
      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.FORGOT-PASSWORD: Updating user attributes');

      user.reset_password_token = md5(user.password + Math.random());
      user.reset_password_expires = momentDate().add(config.tokens.passwordReset.expireTime, 'h');
      return user.save(['reset_password_token', 'reset_password_expires'])
        .then((updatedUser) => {
          emailClient.sendResetPasswordMail(user);

          return res.json({ status: 'success', data: { user: { id: updatedUser.uid } } });
        });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL.FORGOT-PASSWORD: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * User reset password flow
 *
 * @description Ensure token not expired; Rehash the new password
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const resetPassword = (req, res) => {
  const { resetPasswordToken } = req.query;

  User.findOne({ where: { reset_password_token: resetPasswordToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.reset_password_expires < momentDate();

      if (!user || tokenExpired) {
        const serviceError = new ServiceError({
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          info: {
            statusCode: 403,
            statusText: 'fail',
            data: { user: 'A user does not exist for the given token or token expired' },
          },
        }, `No user found with given token or token expired: ${user.uid}`);

        throw (serviceError);
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.RESET-PASSWORD: Updating user attributes');

      return user.comparePassword(req.body.password)
        .then((passwordMatch) => {
          if (passwordMatch) return ({ user, passwordMatch });

          return user;
        });
    })
    .then((obj) => {
      const user = obj;

      if (!user.passwordMatch) {
        return user.hashPassword(req.body.password)
          .then((hash) => {
            user.password = hash;
            user.reset_password_token = null;
            user.reset_password_expires = null;
            return user.save(['password', 'reset_password_token', 'reset_password_expires']);
          });
      }

      user.reset_password_token = null;
      user.reset_password_expires = null;
      return user.save(['password', 'reset_password_token', 'reset_password_expires']);
    })
    .then((updatedUser) => {
      logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.RESET-PASSWORD: User password has been reset');
      return res.json({ status: 'success', data: { user: { id: updatedUser.uid } } });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL.RESET-PASSWORD: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

module.exports = {
  signup,
  confirmAccount,
  login,
  forgotPassword,
  resetPassword,
};
