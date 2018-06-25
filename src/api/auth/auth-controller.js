const jwt = require('jsonwebtoken');
const logger = require('local-logger');
const config = require('config');
const md5 = require('md5');
const generateCode = require('local-generate-code');
const addMinutes = require('date-fns/add_minutes');
const ApiError = require('local-errors');
const formatError = require('local-error-handler');
const authErrors = require('./auth-errors');
const emailOpts = require('./auth-email-options');
const mailer = require('local-mailer');
const knex = require('knex')(config.database);
const { UserModel } = require('local-models');

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
  knex('users')
    .where({ email: req.body.email })
    .first()
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
        const type = config.auth.confirmable ? 'CONFIRMATION_EMAIL' : 'WELCOME_EMAIL';

        logger.info({ uuid: user.uuid }, 'AUTH-CTRL.SIGNUP: User created');
        return mailer.send(user, emailOpts[type]);
      }

      throw new ApiError(authErrors.DUPLICATE_EMAIL);
    })
    .then(({ user }) =>
      res.status(201).json({ data: { user: { uuid: user.uuid } } }),
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

  return knex('users')
    .where({ confirmed_token: confirmToken })
    .first()
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.confirmed_expires < new Date();

      if (!user || tokenExpired) {
        throw new ApiError(authErrors.INVALID_TOKEN(user, 'confirm account'));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Confirming user\'s account');

      return User.update(user, {
        confirmed: true,
        confirmed_token: null,
        confirmed_expires: null,
      });
    })
    .then(user => mailer.send(user, emailOpts.WELCOME_EMAIL))
    .then(({ user }) => {
      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.CONFIRM-ACCOUNT: Account was confirmed');
      return res.json({ data: { user: { uuid: user.uuid } } });
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
 * @description Checks credentials; Updates attributes; Logs in the user
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const login = (req, res) =>
  knex('users')
    .innerJoin('roles', 'users.role_id', 'roles.id')
    .where({ email: req.body.email })
    .first()
    .then((user) => {
      const notConfirmed = config.auth.confirmable ? (user && !user.confirmed) : false;

      if (user && user.account_locked) throw new ApiError(authErrors.ACCOUNT_LOCKED);
      if (!user || notConfirmed) throw new ApiError(authErrors.INVALID_USER_OR_NOT_CONFIRMED(user));

      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.LOGIN: Found user');
      return User.comparePassword(user, req.body.password);
    })
    .then(({ isMatch, user }) => {
      if (!isMatch) {
        return knex('users')
          .where({ uuid: user.uuid })
          .increment('login_attempts', 1)
          .then(() =>
            knex('users')
              .where({ uuid: user.uuid })
              .first()
              .then(updatedUser =>
                User.checkForLockedAccount(updatedUser)))
          .then(updatedUser => ({
            isMatch,
            accountLocked: updatedUser.locked,
            user: updatedUser.user,
          }));
      }

      return {
        isMatch,
        accountLocked: false,
        user,
      };
    })
    .then(({ isMatch, accountLocked, user }) => {
      if (accountLocked) {
        return mailer.send(user, emailOpts.UNLOCK_ACCOUNT_EMAIL)
          .then(() => { throw new ApiError(authErrors.ACCOUNT_LOCKED); });
      }

      return { isMatch, user };
    })
    .then(({ isMatch, user }) => {
      if (!isMatch) {
        throw new ApiError(authErrors.INVALID_PASSWORD);
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.LOGIN: Updating user attributes');

      return User.update(user, {
        login_attempts: 0,
        last_visit: new Date(),
        ip: req.ip,
      });
    })
    .then((updatedUser) => {
      jwt.sign({
        uuid: updatedUser.uuid,
        role: updatedUser.role,
      },
      config.auth.jwt.secret,
      { expiresIn: config.auth.jwt.expireTime }, (e, token) => {
        if (e) throw (e);

        logger.info({ uuid: updatedUser.uuid }, 'AUTH-CTRL.LOGIN: Logging in user');
        return res.json({ data: { token } });
      });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.LOGIN: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

/**
 * User verify account flow
 *
 * @description Verify user, send user's pre-selected security questions
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const verifyAccount = (req, res) =>
  knex('users')
    .where({ email: req.body.email })
    .first()
    .then((obj) => {
      const user = obj;
      const notConfirmed = config.auth.confirmable ? !user.confirmed : false;

      if (!user || notConfirmed) {
        throw new ApiError(authErrors.INVALID_USER_OR_NOT_CONFIRMED(user));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.VERIFY-ACCOUNT: Found user');
      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.VERIFY-ACCOUNT: Retrieving security questions');

      const query = knex.select('short_name', 'question')
        .from('users_security_questions')
        .innerJoin(
          'users',
          'users.id',
          'users_security_questions.user_id',
        )
        .innerJoin(
          'security_questions',
          'security_questions.id',
          'users_security_questions.question_id',
        )
        .where({ email: user.email });

      return { uuid: user.uuid, query };
    })
    .then(({ uuid, query }) => {
      if (config.auth.securityQuestions) {
        return query.then(questions => res.json({ data: { uuid, questions } }));
      }

      return res.json({ data: { uuid } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.VERIFY-ACCOUNT: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

/**
 * User verify security questions flow
 *
 * @description Verify answers to security questions, send email with verification code
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const verifySecurityQuestions = (req, res) => {
  const { verificationType } = req.params;
  const answers = Object.entries(req.body.answers);

  return knex.select('short_name', 'answer')
    .from('users_security_questions')
    .innerJoin(
      'users',
      'users.id',
      'users_security_questions.user_id',
    )
    .innerJoin(
      'security_questions',
      'security_questions.id',
      'users_security_questions.question_id',
    )
    .where({ uuid: req.body.uuid })
    .whereIn(['short_name', 'answer'], answers)
    .then(queryResults =>
      knex('users')
        .where({ uuid: req.body.uuid })
        .first()
        .then((user) => {
          if (user && user.account_locked) throw new ApiError(authErrors.ACCOUNT_LOCKED);

          return { results: queryResults, user };
        })
        .then(({ results, user }) => {
          const isValid = results.length === answers.length;

          if (!isValid) {
            return knex('users')
              .where({ uuid: user.uuid })
              .increment('security_question_attempts', 1)
              .then(() =>
                knex('users')
                  .where({ uuid: user.uuid })
                  .first()
                  .then(updatedUser =>
                    User.checkForLockedAccount(updatedUser)))
              .then(updatedUser => ({
                isValid,
                accountLocked: updatedUser.locked,
                user: updatedUser.user,
              }));
          }

          return {
            isValid,
            accountLocked: false,
            user,
          };
        })
        .then(({ isValid, accountLocked, user }) => {
          if (accountLocked) {
            return mailer.send(user, emailOpts.UNLOCK_ACCOUNT_EMAIL)
              .then(() => { throw new ApiError(authErrors.ACCOUNT_LOCKED); });
          }

          return { isValid, user };
        })
        .then(({ isValid, user }) => {
          let codeField;
          let expiresField;

          if (!isValid) {
            throw new ApiError(authErrors.INVALID_SECURITY_QUESTION);
          }

          if (verificationType === 'reset-password') {
            codeField = 'reset_password_code';
            expiresField = 'reset_password_expires';
          }

          if (verificationType === 'unlock-account') {
            codeField = 'unlock_account_code';
            expiresField = 'unlock_account_expires';
          }

          logger.info({ uuid: user.uuid, verificationType },
            'AUTH-CTRL.VERIFY-QUESTIONS: Creating verification code code');

          return User.update(user, {
            account_locked: true,
            [codeField]: generateCode(),
            [expiresField]: addMinutes(new Date(),
              config.auth.tokens.passwordReset.expireTime),
          });
        })
        .then((updatedUser) => {
          let emailType;

          if (verificationType === 'reset-password') emailType = 'RESET_PASSWORD_EMAIL';
          if (verificationType === 'unlock-account') emailType = 'UNLOCK_ACCOUNT_EMAIL';

          return mailer.send(updatedUser, emailOpts[emailType]);
        })
        .then(({ user }) => res.json({ data: { user: { uuid: user.uuid } } }))
        .catch((error) => {
          const err = formatError(error);

          logger[err.level]({ err: error, response: err },
            `AUTH-CTRL.FORGOT-PASSWORD: ${err.message}`);
          return res.status(err.statusCode).json({ errors: err.jsonResponse });
        }));
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
const resetPassword = (req, res) =>
  knex('users')
    .where({ reset_password_code: req.body.resetPasswordCode })
    .first()
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.reset_password_expires < new Date();

      if (!user || tokenExpired) {
        throw new ApiError(authErrors.INVALID_TOKEN(user, 'reset password'));
      }

      return user;
    })
    .then((obj) => {
      const user = obj;

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.RESET-PASSWORD: Updating user attributes');
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
          account_locked: false,
          reset_password_code: null,
          reset_password_expires: null,
        }, ['reset_password_code', 'reset_password_expires']);
      }

      return User.update(user, {
        account_locked: false,
        reset_password_code: null,
        reset_password_expires: null,
      });
    })
    .then((updatedUser) => {
      logger.info({
        uuid: updatedUser.uuid,
      }, 'AUTH-CTRL.RESET-PASSWORD: User password has been reset');

      return res.json({ data: { user: { uuid: updatedUser.uuid } } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.RESET-PASSWORD: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

/**
 * User unlock account flow
 *
 * @description Ensure token not expired; unlock the account
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const unlockAccount = (req, res) =>
  knex('users')
    .where({ unlock_account_code: req.body.unlockAccountCode })
    .first()
    .then((obj) => {
      const user = obj;
      const tokenExpired = user && user.unlock_account_expires < new Date();

      if (!user || tokenExpired) {
        throw new ApiError(authErrors.INVALID_TOKEN(user, 'unlock account'));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.UNLOCK-ACCOUNT: Unlocking user\'s account');

      return User.update(user, {
        account_locked: false,
        unlock_account_code: null,
        unlock_account_expires: null,
        login_attempts: 0,
      });
    })
    .then((updatedUser) => {
      logger.info({ uuid: updatedUser.uuid }, 'AUTH-CTRL.UNLOCK-ACCOUNT: Account was unlocked');
      return res.json({ data: { user: { uuid: updatedUser.uuid } } });
    })
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.UNLOCK-ACCOUNT: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

/**
 * Resend confirmation email
 *
 * @description Finds user based on email; Resends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const resendConfirmation = (req, res) =>
  knex('users')
    .where({ email: req.body.email })
    .first()
    .then((user) => {
      if (!user || user.confirmed) {
        throw new ApiError(authErrors.INVALID_USER_OR_CONFIRMED(user));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.RECONFIRM: Creating confirm account token');

      return User.update(user, {
        confirmed_token: md5(user.email + Math.random()),
        confirmed_expires: addMinutes(new Date(), config.auth.tokens.confirmed.expireTime),
      });
    })
    .then((user) => {
      if (!user || user.confirmed) {
        throw new ApiError(authErrors.INVALID_USER_OR_CONFIRMED(user));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.RECONFIRM: Resending email for confirmation');
      return mailer.send(user, emailOpts.CONFIRMATION_EMAIL);
    })
    .then(() => res.json({ data: null }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.RECONFIRM: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

/**
 * Resend unlock account email
 *
 * @description Finds user based on email; Resends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const resendUnlockAccount = (req, res) =>
  knex('users')
    .where({ email: req.body.email })
    .first()
    .then((user) => {
      if (!user || !user.account_locked) {
        throw new ApiError(authErrors.INVALID_USER_OR_ACCOUNT_NOT_LOCKED(user));
      }

      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.REUNLOCK: Creating unlock account token');

      return User.update(user, {
        unlock_account_code: generateCode(),
        unlock_account_expires: addMinutes(new Date(), config.auth.tokens.unlockAccount.expireTime),
      });
    })
    .then((user) => {
      logger.info({ uuid: user.uuid }, 'AUTH-CTRL.REUNLOCK: Resending email to unlock account');
      return mailer.send(user, emailOpts.UNLOCK_ACCOUNT_EMAIL);
    })
    .then(() => res.json({ data: null }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `AUTH-CTRL.REUNLOCK: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

module.exports = {
  signup,
  confirmAccount,
  login,
  verifyAccount,
  verifySecurityQuestions,
  resetPassword,
  unlockAccount,
  resendConfirmation,
  resendUnlockAccount,
};
