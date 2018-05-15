const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const md5 = require('md5');
const addHours = require('date-fns/add_hours');
const ApiError = require('local-errors');
const formatError = require('local-error-handler');
const authErrors = require('./auth-errors');
const emailClient = require('./auth-emails');
const UserModel = require('../../models/user');

const User = new UserModel();

/**
 * User sign up flow
 *
 * @description Creates a new user; Sends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const signup = (req, res) =>
  User.knex()
    .where({ email: req.body.email })
    .first()
    .then((user) => {
      if (!user) User.validate(req.body);

      return user;
    })
    .then((user) => {
      if (!user) {
        logger.info('AUTH-CTRL.SIGNUP: Creating new user');

        return User.create({
          email: req.body.email,
          first_name: req.body.firstName,
          last_name: req.body.lastName,
          password: req.body.password,
          ip: req.ip,
        });
      }

      return null;
    })
    .then((user) => {
      if (user) {
        logger.info({ uid: user.uid }, 'AUTH-CTRL.SIGNUP: User created');

        return emailClient.sendConfirmMail(user);
      }

      const appError = {
        name: 'AppError',
        message: 'Duplicate email address',
        statusCode: '400',
        errors: [{
          statusCode: '400',
          message: 'The email address already exists',
          code: 'DUPLICATE_EMAIL',
          source: { path: 'data/user/email' },
        }],
      };

      throw new ApiError(appError);
    })
    .then(({ user }) =>
      res.status(201).json({ data: { user: { uid: user.uid } } }),
    )
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.SIGNUP: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
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

  return User.knex()
    .where({ confirmed_token: confirmToken })
    .first()
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.confirmed_expires < new Date();

      if (!user || tokenExpired) {
        throw new ApiError(authErrors.INVALID_TOKEN(user));
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Confirming user\'s account');

      return User.update(user, {
        confirmed: true,
        confirmed_token: null,
        confirmed_expires: null,
      });
    })
    .then((updatedUser) => {
      logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Account was confirmed');
      return res.json({ data: { user: { uid: updatedUser.uid } } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.CONFIRM-ACCOUNT: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
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
  User.knex()
    .innerJoin('roles', 'users.role_id', 'roles.id')
    .where({ email: req.body.email })
    .first()
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        throw new ApiError(authErrors.INVALID_USER(user));
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.LOGIN: Found user');

      return User.comparePassword(user, req.body.password);
    })
    .then(({ isMatch, user }) => {
      const userObj = user;

      if (!isMatch) {
        const appError = {
          name: 'AppError',
          message: 'Invalid credentials',
          statusCode: '401',
          errors: [{
            statusCode: '401',
            message: 'The user credentials are invalid',
            code: 'INVALID_CREDENTIALS',
            source: { path: 'data/user' },
          }],
        };

        throw new ApiError(appError);
      }

      logger.info({ uid: userObj.uid }, 'AUTH-CTRL.LOGIN: Updating user attributes');

      return User.update(userObj, {
        last_visit: new Date(),
        ip: req.ip,
      });
    })
    .then((updatedUser) => {
      jwt.sign({
        uid: updatedUser.uid,
        role: updatedUser.role,
      },
      config.auth.jwt.secret,
      { expiresIn: config.auth.jwt.expireTime }, (e, token) => {
        if (e) throw (e);

        logger.info({ uid: updatedUser.uid }, 'AUTH-CTRL.LOGIN: Logging in user');
        return res.json({ data: { token } });
      });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.LOGIN: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
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
  User.knex()
    .where({ email: req.body.email })
    .first()
    .then((obj) => {
      const user = obj;

      if (!user || !user.confirmed) {
        throw new ApiError(authErrors.INVALID_USER(user));
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.FORGOT-PASSWORD: Found user');
      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.FORGOT-PASSWORD: Updating user attributes');

      return User.update(user, {
        reset_password_token: md5(user.password + Math.random()),
        reset_password_expires: addHours(new Date(), config.auth.tokens.passwordReset.expireTime),
      });
    })
    .then(updatedUser => emailClient.sendResetPasswordMail(updatedUser))
    .then(({ user }) => res.json({ data: { user: { uid: user.uid } } }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.FORGOT-PASSWORD: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
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

  return User.knex()
    .where({ reset_password_token: resetPasswordToken })
    .first()
    .then((obj) => {
      User.validate(req.body);

      return obj;
    })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.reset_password_expires < new Date();

      if (!user || tokenExpired) {
        throw new ApiError(authErrors.INVALID_TOKEN(user));
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.RESET-PASSWORD: Updating user attributes');

      return User.comparePassword(user, req.body.password);
    })
    .then(({ isMatch, user }) => {
      if (!isMatch) {
        return User.hashPassword(user, req.body.password);
      }

      return { hashedPassword: null, user };
    })
    .then(({ hashedPassword, user }) => {
      if (hashedPassword) {
        return User.update(user, {
          password: hashedPassword,
          reset_password_token: null,
          reset_password_expires: null,
        });
      }

      return User.update(user, {
        reset_password_token: null,
        reset_password_expires: null,
      });
    })
    .then((updatedUser) => {
      logger.info({
        uid: updatedUser.uid,
      }, 'AUTH-CTRL.RESET-PASSWORD: User password has been reset');

      return res.json({ data: { user: { uid: updatedUser.uid } } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.RESET-PASSWORD: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
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
  User.knex()
    .where({ email: req.body.email })
    .first()
    .then((user) => {
      if (!user || user.confirmed) {
        const appError = {
          name: 'AppError',
          message: 'Invalid user credentials or user already confirmed',
          statusCode: '401',
          errors: [{
            statusCode: '401',
            message: `The user ${!user ? 'credentials are invalid' : 'is already confirmed'}`,
            code: (!user) ? 'INVALID_CREDENTIALS' : 'USER_ALREADY_CONFIRMED',
            source: { path: 'data/user' },
          }],
        };

        throw new ApiError(appError);
      }

      return emailClient.sendConfirmMail(user);
    })
    .then(({ user }) => {
      const userObj = user;

      logger.info({ uid: user.uid }, 'AUTH-CTRL.RECONFIRM: Resent email for confirmation');

      return User.update(userObj, {
        confirmed_expires: addHours(new Date(), config.auth.tokens.confirmed.expireTime),
      });
    })
    .then(() => res.json({ data: null }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.RECONFIRM: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

module.exports = {
  signup,
  confirmAccount,
  login,
  forgotPassword,
  resetPassword,
  resendConfirmation,
};
