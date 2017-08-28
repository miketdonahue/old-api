const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const momentDate = require('moment');
const md5 = require('md5');
const ServiceError = require('verror');
const formatError = require('local-error-formatter');
// const emailClient = require('local-mailer');
const User = require('../../models/user');

/**
 * Example documentation.
 * @function
 */
const signup = (req, res) => {
  User.findOne({ where: { email: req.body.email } })
    .then((user) => {
      if (!user) {
        return User.create({
          email: req.body.email,
          name: req.body.name,
          password: req.body.password,
          last_visit: momentDate().utc(),
          ip: req.ip,
        }, {
          fields: ['short_id', 'name', 'email', 'password', 'last_visit', 'ip', 'confirmed_token', 'confirmed_expires'],
        });
      }

      return null;
    })
    .then((user) => {
      if (user) {
      // TODO: This works, but abstract it into the module
      // Unverified accounts should be removed after 2 weeks
      // Internal operation, so we log error and get alerts on logs
      // instead of sending back to client
      // emailClient.sendConfirmMail(user);

        logger.info('AUTH-CTRL: User created');
        return res.status(201).json({
          status: 'success',
          data: { user: { id: user.short_id } },
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

      logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Example documentation.
 * @function
 */
const confirmAccount = (req, res) => {
  const confirmToken = req.query.confirmToken;

  User.findOne({ where: { confirmed_token: confirmToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.confirmed_expires < momentDate().utc();

      if (!user || tokenExpired) {
        const serviceError = new ServiceError({
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          info: {
            statusCode: 403,
            statusText: 'fail',
            data: { user: 'A user does not exist for the given token or token expired' },
          },
        }, 'No user found with given token or token expired');

        throw (serviceError);
      }

      logger.info('AUTH-CTRL: Updating user');

      user.confirmed = true;
      user.confirmed_token = null;
      user.confirmed_expires = null;
      return user.save(['confirmed', 'confirmed_token', 'confirmed_expires']);
    })
    .then((updatedUser) => {
      jwt.sign({
        id: updatedUser.short_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime }, (e, token) => {
        if (e) {
          const error = formatError(e);

          logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
          return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
        }

        // Send out the welcome email

        logger.info('AUTH-CTRL: Logging in user');
        return res.json({ status: 'success', data: { token } });
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};


/**
 * Example documentation.
 * @function
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
        }, 'Email does not exist or user email is not confirmed');

        throw (serviceError);
      }

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
            }, 'User password does not match DB');

            throw (serviceError);
          }

          user.last_visit = momentDate().utc();
          user.ip = req.ip;
          return user.save(['last_visit', 'ip']);
        });
    })
    .then((updatedUser) => {
      jwt.sign({
        id: updatedUser.short_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expireTime }, (e, token) => {
        if (e) {
          const error = formatError(e);

          logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
          return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
        }

        logger.info('AUTH-CTRL: Logging in user');
        return res.json({ status: 'success', data: { token } });
      });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Example documentation.
 * @function
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
        }, 'Email does not exist or user email is not confirmed');

        throw (serviceError);
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      user.reset_password_token = md5(user.password + Math.random());
      user.reset_password_expires = momentDate().utc().add(1, 'h');

      return user.save(['reset_password_token', 'reset_password_expires'])
        .then((updatedUser) => {
          logger.info('AUTH-CTRL: Password reset token and expire date set');

          // Send out reset password email
          // emailClient.sendResetPasswordMail(user);

          return res.json({ status: 'success', data: { user: { id: updatedUser.short_id } } });
        });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

/**
 * Example documentation.
 * @function
 */
const resetPassword = (req, res) => {
  const resetPasswordToken = req.query.resetPasswordToken;

  User.findOne({ where: { reset_password_token: resetPasswordToken } })
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.reset_password_expires < momentDate().utc();

      if (!user || tokenExpired) {
        const serviceError = new ServiceError({
          name: (!user) ? 'UserNotFound' : 'ExpiredToken',
          info: {
            statusCode: 403,
            statusText: 'fail',
            data: { user: 'A user does not exist for the given token or token expired' },
          },
        }, 'No user found with given token or token expired');

        throw (serviceError);
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      return user.hashPassword(req.body.password)
        .then((hash) => {
          user.password = hash;
          user.reset_password_token = null;
          user.reset_password_expires = null;

          return user.save(['password', 'reset_password_token', 'reset_password_expires']);
        });
    })
    .then((updatedUser) => {
      logger.info('AUTH-CTRL: User password has been reset');

      return res.json({ status: 'success', data: { user: { id: updatedUser.short_id } } });
    })
    .catch((err) => {
      const error = formatError(err);

      logger.error({ error, err: error.stack }, `AUTH-CTRL: ${error.message}`);
      return res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

// TODO: User needs to be able to edit their info (change password, etc) and delete account
// Do this in a profile route

module.exports = {
  signup,
  confirmAccount,
  login,
  forgotPassword,
  resetPassword,
};
