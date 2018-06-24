/**
 * Confirmation email options
 */
const CONFIRMATION_EMAIL = {
  campaignId: 'signup-confirmation',
  templateId: 'signup-confirmation',
  substitutionData: user => ({
    first_name: user.first_name,
    confirmed_token: user.confirmed_token,
  }),
};

/**
 * New user welcome email options
 */
const WELCOME_EMAIL = {
  campaignId: 'welcome',
  templateId: 'welcome',
  substitutionData: user => ({
    first_name: user.first_name,
  }),
};

/**
 * Reset password email options
 */
const RESET_PASSWORD_EMAIL = {
  campaignId: 'reset-password',
  templateId: 'reset-password',
  substitutionData: user => ({
    first_name: user.first_name,
    reset_password_code: user.reset_password_code,
  }),
};

/**
 * Unlock account email options
 */
const UNLOCK_ACCOUNT_EMAIL = {
  campaignId: 'unlock-account',
  templateId: 'unlock-account',
  substitutionData: user => ({
    first_name: user.first_name,
    unlock_account_code: user.unlock_account_code,
  }),
};

module.exports = {
  CONFIRMATION_EMAIL,
  WELCOME_EMAIL,
  RESET_PASSWORD_EMAIL,
  UNLOCK_ACCOUNT_EMAIL,
};
