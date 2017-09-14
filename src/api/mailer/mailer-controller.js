const logger = require('local-logger');
const momentDate = require('moment');
const config = require('config');
const ServiceError = require('verror');
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
const confirmMail = (req, res) => {
  User.findOne({ where: { uid: req.body.uid } })
    .then((user) => {
      if (!user) {
        const serviceError = new ServiceError({
          name: 'UserNotFound',
          info: {
            statusCode: 400,
            statusText: 'fail',
            data: { user: 'No user found with specified uid' },
          },
        }, `No user was found with uid: ${req.body.uid}`);

        throw (serviceError);
      }

      logger.info({ uid: user.uid }, 'MAILER-CTRL.CONFIRM: Resending email for confirmation');

      return emailClient.sendConfirmMail(user, (err, emailSent) => {
        const userObj = user;

        if (emailSent) {
          userObj.confirmed_expires = momentDate().add(config.tokens.confirmed.expireTime, 'h');
          return userObj.save(['confirmed_expires'])
            .then(() => res.json({ status: 'success', data: {} }));
        }

        return undefined;
      });
    })
    .catch((err) => {
      const error = formatError(err);
      const level = logger.determineLevel(error.jse_info.statusCode);

      logger[level]({ err: error }, `MAILER-CTRL.CONFIRM: ${error.message}`);
      res.status(error.jse_info.statusCode).json(error.jse_info.jsonResponse());
    });
};

module.exports = {
  confirmMail,
};
