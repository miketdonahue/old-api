/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const addMinutes = require('date-fns/add_minutes');
const subtractHours = require('date-fns/sub_hours');
const proxyquire = require('proxyquire').noCallThru();
const UserModel = require('../../../models/user');

describe('Unit Test: Auth', () => {
  let mock;
  let authController;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mock = {
      req: {},
      res: {
        status: sinon.spy(() => mock.res),
        json: sinon.spy(),
      },
      mailer: {
        sendConfirmMail: sandbox.stub(),
        sendResetPasswordMail: sandbox.stub(),
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
      jsonwebtoken: {
        sign: sandbox.stub(),
      },
      config: {
        auth: {
          jwt: {
            secret: 'secret',
            expireTime: '1h',
          },
          tokens: {
            confirmed: {
              expireTime: 2,
            },
            passwordReset: {
              expireTime: 2,
            },
          },
        },
      },
    };

    authController = proxyquire('../auth-controller', {
      './auth-emails': mock.mailer,
      'local-logger': mock.logger,
      jsonwebtoken: mock.jsonwebtoken,
      config: mock.config,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Signup', () => {
    it('should create a new user if the given email does not exist', () => {
      const user = { uid: '123abc' };
      const req = {
        body: {
          email: 'mike@mail.com',
          firstName: 'Mike',
          lastName: 'James',
          password: 'password',
          ip: '0.0.0.0',
        },
      };

      mock.mailer.sendConfirmMail.resolves({ user });

      sandbox.stub(UserModel.prototype, 'create').resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(null),
        }),
      });

      return authController.signup(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;

        expect(status).to.equal(201);
        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given email already exists', () => {
      const createUser = sandbox.stub(UserModel.prototype, 'create');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        email: 'mike@mail.com',
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.signup(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.false;
        expect(createUser.calledOnce).to.be.false;

        expect(status).to.equal('400');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('400');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('DUPLICATE_EMAIL');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user/email');
      });
    });
  });

  describe('Confirm Account', () => {
    it('should save a user\'s confirmed attributes', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      const user = {
        uid: '123abc',
        confirmed_expires: addMinutes(new Date(), 1),
      };

      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.confirmAccount(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(updateUser.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(null),
        }),
      });

      return authController.confirmAccount(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(updateUser.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('403');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('403');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('TOKEN_NOT_FOUND');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user/token');
      });
    });

    it('should throw an error if the given user\'s confirm token has expired', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      const user = {
        confirmed_expires: subtractHours(new Date(), 1),
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.confirmAccount(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(updateUser.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('403');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('403');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('TOKEN_EXPIRED');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user/token');
      });
    });
  });

  describe('Login', () => {
    it('should login a user and return the JWT token', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
          password: 'password',
        },
      };

      const user = {
        uid: '123abc',
        confirmed: true,
        role: 'user',
      };

      comparePassword.resolves({ isMatch: true, user });
      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'create').resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        innerJoin: () => ({
          where: () => ({
            first: sandbox.stub().resolves(user),
          }),
        }),
      });

      mock.jsonwebtoken.sign.yields(null, 'jwtToken');

      return authController.login(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(comparePassword.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('token');
        expect(response.data.token).to.equal('jwtToken');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        innerJoin: () => ({
          where: () => ({
            first: sandbox.stub().resolves(null),
          }),
        }),
      });

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(comparePassword.calledOnce).to.be.false;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('INVALID_CREDENTIALS');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });

    it('should throw an error if the user has not confirmed their account', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        confirmed: false,
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        innerJoin: () => ({
          where: () => ({
            first: sandbox.stub().resolves(user),
          }),
        }),
      });

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(comparePassword.calledOnce).to.be.false;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('USER_NOT_CONFIRMED');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });

    it('should throw an error if the given password does not match the user\'s password', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
          password: 'bad_password',
        },
      };

      const user = {
        uid: '123abc',
        confirmed: true,
      };

      comparePassword.resolves({ isMatch: false, user });
      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'create').resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        innerJoin: () => ({
          where: () => ({
            first: sandbox.stub().resolves(user),
          }),
        }),
      });

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(comparePassword.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('INVALID_CREDENTIALS');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });

    it('should throw an error if the JWT has an error', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const error = {
        name: 'JsonWebTokenError',
        message: 'jwt signature is required',
      };
      const req = {
        body: {
          email: 'mike@mail.com',
          password: 'password',
        },
      };

      const user = {
        uid: '123abc',
        confirmed: true,
        role: 'user',
      };

      comparePassword.resolves({ isMatch: true, user });
      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'create').resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        innerJoin: () => ({
          where: () => ({
            first: sandbox.stub().resolves(user),
          }),
        }),
      });

      mock.jsonwebtoken.sign.yields(error);

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(comparePassword.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.true;

        expect(status).to.equal('500');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source', 'meta');
        expect(response.errors[0].statusCode).to.equal('500');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('SERVER_ERROR');
      });
    });
  });

  describe('Forgot Password', () => {
    it('should create a reset password token and send forgotten password email', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        uid: '123abc',
        password: 'password',
        confirmed: true,
        role: 'user',
      };

      mock.mailer.sendResetPasswordMail.resolves({ user });

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.forgotPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;
        expect(mock.mailer.sendResetPasswordMail.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(null),
        }),
      });

      return authController.forgotPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.false;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('INVALID_CREDENTIALS');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });

    it('should throw an error if the user has not confirmed their account', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        confirmed: false,
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.forgotPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.false;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('USER_NOT_CONFIRMED');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });
  });

  describe('Reset Password', () => {
    it('should hash and save a user\'s new password and reset password attributes', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const hashPassword = sandbox.stub(UserModel.prototype, 'hashPassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
        body: {
          password: 'new_password',
        },
      };

      const user = {
        uid: '123abc',
        reset_password_expires: addMinutes(new Date(), 1),
      };

      comparePassword.resolves({ isMatch: false, user });
      hashPassword.resolves({ hashedPassword: 'new_password', user });
      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.resetPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(comparePassword.calledOnce).to.be.true;
        expect(hashPassword.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const hashPassword = sandbox.stub(UserModel.prototype, 'hashPassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(null),
        }),
      });

      return authController.resetPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(comparePassword.calledOnce).to.be.false;
        expect(hashPassword.calledOnce).to.be.false;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('403');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('403');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('TOKEN_NOT_FOUND');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user/token');
      });
    });

    it('should throw an error if the given user\'s reset password token has expired', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const hashPassword = sandbox.stub(UserModel.prototype, 'hashPassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
      };

      const user = {
        reset_password_expires: subtractHours(new Date(), 1),
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.resetPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(comparePassword.calledOnce).to.be.false;
        expect(hashPassword.calledOnce).to.be.false;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('403');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('403');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('TOKEN_EXPIRED');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user/token');
      });
    });

    it('should not hash and save a user\'s password if it is the same as the current password', () => {
      const comparePassword = sandbox.stub(UserModel.prototype, 'comparePassword');
      const hashPassword = sandbox.stub(UserModel.prototype, 'hashPassword');
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
        body: {
          password: 'password',
        },
      };

      const user = {
        uid: '123abc',
        reset_password_expires: addMinutes(new Date(), 1),
      };

      comparePassword.resolves({ isMatch: true, user });
      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.resetPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(hashPassword.calledOnce).to.be.false;
        expect(comparePassword.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });
  });

  describe('Resend Confirmation Email', () => {
    it('should resend the confirmation email', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      mock.mailer.sendConfirmMail.resolves({ user });

      updateUser.resolves(user);
      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      return authController.resendConfirmation(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;
        expect(updateUser.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.be.null;
      });
    });

    it('should throw an error if no user is found', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const req = {
        body: {
          uid: '123abc',
        },
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(null),
        }),
      });

      return authController.resendConfirmation(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.called).to.be.false;
        expect(updateUser.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('401');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('401');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('INVALID_CREDENTIALS');
        expect(response.errors[0].source).to.be.an('object');
        expect(response.errors[0].source).to.have.all.keys('path');
        expect(response.errors[0].source.path).to.equal('data/user');
      });
    });

    it('should throw an error if emailClient has an error', () => {
      const updateUser = sandbox.stub(UserModel.prototype, 'update');
      const error = {
        name: 'SparkPostError',
        statusCode: '500',
        errors: [{}],
      };
      const req = {
        body: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      sandbox.stub(UserModel.prototype, 'knex').returns({
        where: () => ({
          first: sandbox.stub().resolves(user),
        }),
      });

      mock.mailer.sendConfirmMail.rejects(error);

      return authController.resendConfirmation(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;
        expect(updateUser.called).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal('500');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code');
        expect(response.errors[0].statusCode).to.equal('500');
        expect(response.errors[0].code).to.equal('SPARKPOST_ERROR');
      });
    });
  });
});
