/**
 * Invalid Token
 *
 * @description Given a token, the token did not produce a user or was expired
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_TOKEN = user => ({
  name: 'AppError',
  message: 'Invalid token',
  statusCode: '403',
  errors: [{
    statusCode: '403',
    message: `The token ${!user ? 'was not found' : 'has expired'}`,
    code: (!user) ? 'TOKEN_NOT_FOUND' : 'TOKEN_EXPIRED',
    source: { path: 'data/user/token' },
  }],
});

/**
 * Invalid User
 *
 * @description Given a user email, the email could not be found or the user is not confirmed yet
 * @function
 * @param {Object} user - User returned from database
 */
const INVALID_USER = user => ({
  name: 'AppError',
  message: 'Invalid user credentials or user not confirmed',
  statusCode: '401',
  errors: [{
    statusCode: '401',
    message: `The user ${!user ? 'credentials are invalid' : 'is not confirmed'}`,
    code: (!user) ? 'INVALID_CREDENTIALS' : 'USER_NOT_CONFIRMED',
    source: { path: 'data/user' },
  }],
});

module.exports = {
  INVALID_TOKEN,
  INVALID_USER,
};
