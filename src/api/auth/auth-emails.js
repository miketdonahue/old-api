const mailer = require('local-mailer');

/**
 * Send confirmation email
 *
 * @function
 * @param {Object} user - Information about the user
 * @returns {Promise} - Send email
 */
function sendConfirmMail(user) {
  const options = {
    campaignId: 'signup-confirmation',
    templateId: 'signup-confirmation',
    substitutionData: {
      first_name: user.first_name,
      confirmed_token: user.confirmed_token,
    },
  };

  return mailer.send(user, options);
}

/**
 * Send new user welcome email
 *
 * @function
 * @param {Object} user - Information about the user
 * @returns {Promise} - Send email
 */
function sendWelcomeMail(user) {
  const options = {
    campaignId: 'welcome',
    templateId: 'welcome',
    substitutionData: {
      first_name: user.first_name,
    },
  };

  return mailer.send(user, options);
}

/**
 * Send reset password email
 *
 * @function
 * @param {Object} user - Information about the user
 * @returns {Promise} - Send email
 */
function sendResetPasswordMail(user) {
  const options = {
    campaignId: 'reset-password',
    templateId: 'reset-password',
    substitutionData: {
      first_name: user.first_name,
      reset_password_token: user.reset_password_token,
    },
  };

  return mailer.send(user, options);
}

module.exports = {
  sendConfirmMail,
  sendWelcomeMail,
  sendResetPasswordMail,
};
