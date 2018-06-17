/**
 * Duplicate Email
 *
 * @description Given an email, the same email already exists in the database
 */
const DUPLICATE_EMAIL = {
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

/**
 * Invalid Credentials
 *
 * @description The user email or password is incorrect
 */
const INVALID_PASSWORD = {
  name: 'AppError',
  message: 'Invalid password',
  statusCode: '401',
  errors: [{
    statusCode: '401',
    message: 'The user credentials are invalid',
    code: 'INVALID_CREDENTIALS',
    source: { path: 'data/user' },
  }],
};

/**
 * Invalid Token
 *
 * @description Given a token, the token did not produce a user or was expired
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_TOKEN = (user, type) => ({
  name: 'AppError',
  message: `Invalid ${type} token`,
  statusCode: '403',
  errors: [{
    statusCode: '403',
    message: `The ${type} token ${!user ? 'was not found' : 'has expired'}`,
    code: (!user) ? 'TOKEN_NOT_FOUND' : 'TOKEN_EXPIRED',
    source: { path: 'data/user/token' },
  }],
});

/**
 * Invalid User / User Not Confirmed
 *
 * @description Given a user email, the email could not be found or the user is not confirmed yet
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_USER_OR_NOT_CONFIRMED = user => ({
  name: 'AppError',
  message: `The user ${!user ? 'was not found' : 'is not confirmed'}`,
  statusCode: '401',
  errors: [{
    statusCode: '401',
    message: `The user ${!user ? 'credentials are invalid' : 'is not confirmed'}`,
    code: (!user) ? 'INVALID_CREDENTIALS' : 'USER_NOT_CONFIRMED',
    source: { path: 'data/user' },
  }],
});

/**
 * Invalid User / User Not Confirmed
 *
 * @description Given a user email, the email could not be found or the user is not confirmed yet
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_USER_OR_CONFIRMED = user => ({
  name: 'AppError',
  message: 'Invalid user credentials or user already confirmed',
  statusCode: '401',
  errors: [{
    statusCode: '401',
    message: `The user ${!user ? 'credentials are invalid' : 'is already confirmed'}`,
    code: (!user) ? 'INVALID_CREDENTIALS' : 'USER_ALREADY_CONFIRMED',
    source: { path: 'data/user' },
  }],
});

/**
 * Invalid User / Account Not Locked
 *
 * @description Given a user email, the email could not be found or the account is not locked
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_USER_OR_ACCOUNT_NOT_LOCKED = user => ({
  name: 'AppError',
  message: 'Invalid user credentials or account not locked',
  statusCode: '401',
  errors: [{
    statusCode: '401',
    message: `The user ${!user ? 'credentials are invalid' : 'account is not locked'}`,
    code: (!user) ? 'INVALID_CREDENTIALS' : 'ACCOUNT_NOT_LOCKED',
    source: { path: 'data/user' },
  }],
});

/**
 * Account Locked
 *
 * @description The account has been locked due to too many failed login attempts
 */
const ACCOUNT_LOCKED = {
  name: 'AppError',
  message: 'Account locked',
  statusCode: '403',
  errors: [{
    statusCode: '403',
    message: 'The user account has been locked',
    code: 'LOCKED_ACCOUNT',
    source: { path: 'data/user' },
  }],
};

module.exports = {
  DUPLICATE_EMAIL,
  INVALID_PASSWORD,
  INVALID_TOKEN,
  INVALID_USER_OR_NOT_CONFIRMED,
  INVALID_USER_OR_CONFIRMED,
  INVALID_USER_OR_ACCOUNT_NOT_LOCKED,
  ACCOUNT_LOCKED,
};
