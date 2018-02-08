const mailer = require('local-mailer');

/**
 * Send confirmation email
 *
 * @description Using local-mailer, send an email with confirmation options
 * @function
 * @param {Object} user - Information about the user
 * @param {Object} callback - [err, data]
 * @returns {Promise} - Send email
 */
function sendConfirmMail(user, callback) {
  const options = {
    campaignId: 'signup-confirmation',
    templateId: 'signup-confirmation',
    substitutionData: {
      first_name: user.first_name,
      confirmed_token: user.confirmed_token,
    },
  };

  return mailer.send(user, options, callback);
}

/**
 * Send new user welcome email
 *
 * @description Using local-mailer, send an email with welcome options
 * @function
 * @param {Object} user - Information about the user
 * @param {Object} callback - [err, data]
 * @returns {Promise} - Send email
 */
function sendWelcomeMail(user, callback) {
  const options = {
    campaignId: 'welcome',
    templateId: 'welcome',
    substitutionData: {
      first_name: user.first_name,
    },
  };

  return mailer.send(user, options, callback);
}

/**
 * Send reset password email
 *
 * @description Using local-mailer, send an email with reset password options
 * @function
 * @param {Object} user - Information about the user
 * @param {Object} callback - [err, data]
 * @returns {Promise} - Send email
 */
function sendResetPasswordMail(user, callback) {
  const options = {
    campaignId: 'reset-password',
    templateId: 'reset-password',
    substitutionData: {
      first_name: user.first_name,
      reset_password_token: user.reset_password_token,
    },
  };

  return mailer.send(user, options, callback);
}

module.exports = {
  sendConfirmMail,
  sendWelcomeMail,
  sendResetPasswordMail,
};
