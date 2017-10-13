const logger = require('local-logger');
const momentDate = require('moment');
const config = require('config');
const formatError = require('local-error-formatter');
const emailClient = require('local-mailer');
const User = require('../../models').user;

/**
 * Resend confirmation email
 *
 * @description Finds user based on uid query param; Resends confirmation email
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const confirmMail = (req, res) =>
  User.findOne({ where: { uid: req.body.uid } })
    .then((user) => {
      if (!user) {
        const serviceError = {
          name: 'UserNotFound',
          message: 'The user was not found',
          statusCode: 400,
          data: { user: 'No user found with specified uid' },
        };

        throw (serviceError);
      }

      return emailClient.sendConfirmMail(user, (err, data) => {
        const userObj = user;

        if (err) {
          const serviceError = {
            name: err.name,
            message: err.message,
            errors: err.errors,
          };

          throw (serviceError);
        }

        if (data) {
          userObj.confirmed_expires = momentDate().add(config.tokens.confirmed.expireTime, 'h');

          logger.info({
            uid: user.uid,
            results: data.results,
          }, 'MAILER-CTRL.CONFIRM: Resent email for confirmation');

          return userObj.save(['confirmed_expires'])
            .then(() => res.json({ status: 'success', data: null }));
        }

        return undefined;
      });
    })
    .catch((err) => {
      const error = formatError(err);
      const { level, statusCode, jsonResponse } = error.jse_info;

      logger[level]({ err: error, errors: err.errors }, `MAILER-CTRL.CONFIRM: ${error.message}`);
      return res.status(statusCode).json(jsonResponse);
    });

module.exports = {
  confirmMail,
};
