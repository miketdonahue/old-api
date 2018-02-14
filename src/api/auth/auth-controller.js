const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const momentDate = require('moment');
const md5 = require('md5');
const formatError = require('local-error-formatter');
const emailClient = require('./auth-emails');
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
        logger.info({ uid: user.uid }, 'AUTH-CTRL.SIGNUP: User created');

        return emailClient.sendConfirmMail(user);
      }

      const serviceError = {
        name: 'UserExists',
        message: 'Duplicate email',
        statusCode: 400,
        data: { email: 'A user with this email has already been created' },
      };

      throw (serviceError);
    })
    .then(({ user }) => res.status(201).json({ status: 'success', data: { user: { uid: user.uid } } }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.SIGNUP: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
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
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.CONFIRM-ACCOUNT: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
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
          name: (!user) ? 'InvalidCredentials' : 'NotConfirmed',
          message: 'Invalid credentials or user email is not confirmed',
          statusCode: 400,
          data: { email: (!user) ? 'Credentials are invalid' : 'The email is not confirmed' },
        };

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.LOGIN: Found user');
      return user;
    })
    .then((obj) => {
      const user = obj;

      return user.comparePassword(req.body.password)
        .then(({ isMatch }) => {
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
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.LOGIN: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
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
          name: (!user) ? 'InvalidCredentials' : 'EmailNotConfirmed',
          message: 'Invalid credentials or user email is not confirmed',
          statusCode: 400,
          data: { email: (!user) ? 'Credentials are invalid' : 'The email is not confirmed' },
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
      return user.save(['reset_password_token', 'reset_password_expires']);
    })
    .then(updatedUser => emailClient.sendResetPasswordMail(updatedUser))
    .then(({ user }) => res.json({ status: 'success', data: { user: { uid: user.uid } } }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.FORGOT-PASSWORD: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
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
          name: (!user) ? 'InvalidCredentials' : 'ExpiredToken',
          message: 'Invalid credentials or token expired',
          statusCode: 403,
          data: { user: (!user) ? 'Credentials are invalid' : 'The token has expired' },
        };

        throw (serviceError);
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.RESET-PASSWORD: Updating user attributes');

      return user.comparePassword(req.body.password)
        .then(({ isMatch }) => {
          if (isMatch) return ({ user, isMatch });

          return { user };
        });
    })
    .then((obj) => {
      const user = obj.user;

      if (!obj.isMatch) {
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
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.RESET-PASSWORD: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });
};

/**
 * Resend confirmation email
 *
 * @description Finds user based on uid query param; Resends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const resendConfirmation = (req, res) =>
  User.findOne({ where: { uid: req.body.uid } })
    .then((user) => {
      if (!user || user.confirmed) {
        const serviceError = {
          name: (!user) ? 'InvalidCredentials' : 'UserConfirmed',
          message: 'Invalid credentials or user is already confirmed',
          statusCode: 400,
          data: { email: (!user) ? 'Credentials are invalid' : 'The user is already confirmed' },
        };

        throw (serviceError);
      }

      return emailClient.sendConfirmMail(user);
    })
    .then(({ user }) => {
      const userObj = user;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.RECONFIRM: Resent email for confirmation');

      userObj.confirmed_expires = momentDate().add(config.tokens.confirmed.expireTime, 'h');
      return userObj.save(['confirmed_expires']);
    })
    .then(() => res.json({ status: 'success', data: null }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `AUTH-CTRL.RECONFIRM: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });

module.exports = {
  signup,
  confirmAccount,
  login,
  forgotPassword,
  resetPassword,
  resendConfirmation,
};
