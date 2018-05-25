const { Strategy } = require('passport-local');
const logger = require('local-logger');
const { ApiError, authErrors } = require('local-errors');
const UserModel = require('../../../models/user');

const User = new UserModel();

const localMiddleware = new Strategy({
  usernameField: 'email',
  passwordField: 'password',
  session: false,
}, (email, password, next) => {
  console.log('KKKKK', email, password);
  User.knex()
    .innerJoin('roles', 'users.role_id', 'roles.id')
    .where({ email })
    .first()
    .then((obj) => {
      const user = obj;
      console.log('STRATTT', user);

      if (!user || !user.confirmed) {
        return next(new ApiError(authErrors.INVALID_USER(user)));
      }

      logger.info({ uid: user.uid }, 'AUTH-CTRL.LOGIN: Found user');

      return { user };
    })
    .then(({ user }) =>
      User.comparePassword(user, password)
        .then(({ isMatch }) => {

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

            return next(new ApiError(appError));
          }

          return next(null, user);
        }));
      });

module.exports = localMiddleware;
