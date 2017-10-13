const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const momentDate = require('moment');
const md5 = require('md5');
const formatError = require('local-error-formatter');
const emailClient = require('local-mailer');
const User = require('../../models').user;
const Role = require('../../models').role;

/**
 * User signup flow
 *
 * @description Creates a new user; Sends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const signup = (req, res) =>
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
          fields: ['uid', 'role_id', 'first_name', 'last_name', 'email', 'password', 'last_visit', 'ip', 'confirmed_token', 'confirmed_expires'],
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
          data: { user: { uid: user.uid } },
        });
      }

      const serviceError = {
        name: 'UserExists',
        message: 'This email already exists in the database; Duplicate user',
        statusCode: 400,
        data: { email: 'A user with this email has already been created' },
      };

      throw (serviceError);
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse, addStackTrace } = error.jse_info;

      logger[level]({ err: addStackTrace ? error : undefined }, `AUTH-CTRL.SIGNUP: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
    });

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

  return User.findOne({ where: { confirmed_token: confirmToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.confirmed_expires < momentDate();

      if (!user || tokenExpired) {
        const serviceError = {
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          message: 'The user was not found or the token has expired',
          statusCode: 403,
          data: { user: (!user) ? 'The user was not found' : 'The token has expired' },
        };

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
      return res.json({ status: 'success', data: { user: { uid: updatedUser.uid } } });
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse, addStackTrace } = error.jse_info;

      logger[level]({ err: addStackTrace ? error : undefined }, `AUTH-CTRL.CONFIRM-ACCOUNT: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
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
const login = (req, res) =>
  User.findOne({
    where: { email: req.body.email },
    include: [{ model: Role }],
  })
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        const serviceError = {
          name: (!user) ? 'EmailNotFound' : 'EmailNotConfirmed',
          message: 'Email does not exist or user email is not confirmed',
          statusCode: 400,
          data: { email: (!user) ? 'The email does not exist' : 'The email is not confirmed' },
        };

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
            const serviceError = {
              name: 'InvalidCredentials',
              message: 'The user has entered invalid credentials',
              statusCode: 400,
              data: { user: 'Credentials are invalid' },
            };

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
        uid: updatedUser.uid,
        role: updatedUser.role.get('name'),
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime }, (e, token) => {
        if (e) throw (e);

        logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.LOGIN: Logging in user');
        return res.json({ status: 'success', data: { token } });
      });
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse, addStackTrace } = error.jse_info;

      logger[level]({ err: addStackTrace ? error : undefined }, `AUTH-CTRL.LOGIN: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
    });

/**
 * User forgot password flow
 *
 * @description Ensure user is confirmed; Generate reset password attributes; Send email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const forgotPassword = (req, res) =>
  User.findOne({ where: { email: req.body.email } })
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        const serviceError = {
          name: (!user) ? 'EmailNotFound' : 'EmailNotConfirmed',
          message: 'Email does not exist or user email is not confirmed',
          statusCode: 400,
          data: { email: (!user) ? 'The email does not exist' : 'The email is not confirmed' },
        };

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

          return res.json({ status: 'success', data: { user: { uid: updatedUser.uid } } });
        });
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse, addStackTrace } = error.jse_info;

      logger[level]({ err: addStackTrace ? error : undefined }, `AUTH-CTRL.FORGOT-PASSWORD: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
    });

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

  return User.findOne({ where: { reset_password_token: resetPasswordToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.reset_password_expires < momentDate();

      if (!user || tokenExpired) {
        const serviceError = {
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          message: 'No user found with given token or token expired',
          statusCode: 403,
          data: { user: (!user) ? 'The user was not found' : 'The token has expired' },
        };

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

          return { user };
        });
    })
    .then((obj) => {
      const user = obj.user;

      if (!obj.passwordMatch) {
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
      return user.save(['reset_password_token', 'reset_password_expires']);
    })
    .then((updatedUser) => {
      logger.info({
        uid: updatedUser.uid,
      }, 'AUTH-CTRL.RESET-PASSWORD: User password has been reset');

      return res.json({ status: 'success', data: { user: { uid: updatedUser.uid } } });
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse, addStackTrace } = error.jse_info;

      logger[level]({ err: addStackTrace ? error : undefined }, `AUTH-CTRL.RESET-PASSWORD: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
    });
};

module.exports = {
  signup,
  confirmAccount,
  login,
  forgotPassword,
  resetPassword,
};
