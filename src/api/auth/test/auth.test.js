/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const momentDate = require('moment');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Auth', () => {
  let mock;
  let authController;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    mock = {
      req: {},
      res: {
        status: sinon.spy(() => mock.res),
        json: sinon.spy(),
      },
      models: {
        user: {
          findOne: sandbox.stub(),
          create: sandbox.stub(),
        },
      },
      mailer: {
        sendConfirmMail: sinon.stub(),
        sendResetPasswordMail: sinon.stub(),
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
      jsonwebtoken: {
        sign: sinon.stub(),
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
      '../../models': mock.models,
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
      const userModel = mock.models.user;
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

      userModel.findOne.resolves(null);
      userModel.create.resolves(user);

      return authController.signup(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;

        expect(status).to.equal(201);
        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given email already exists', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      userModel.findOne.resolves({});

      return authController.signup(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.false;
        expect(userModel.create.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('UserExists');
      });
    });
  });

  describe('Confirm Account', () => {
    it('should save a user\'s confirmed attributes', () => {
      const userModel = mock.models.user;
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      const user = {
        uid: '123abc',
        confirmed_expires: momentDate().subtract(5, 'minutes').format(),
        save: sinon.stub().resolves({ uid: '123abc' }),
      };

      userModel.findOne.resolves(user);

      return authController.confirmAccount(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(user.save.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const userModel = mock.models.user;
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      const user = {
        save: sinon.stub(),
      };

      userModel.findOne.resolves(null);

      return authController.confirmAccount(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(403);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('UserNotFound');
      });
    });

    it('should throw an error if the given user\'s confirm token has expired', () => {
      const userModel = mock.models.user;
      const req = {
        query: {
          confirmToken: 'xyz',
        },
      };

      const user = {
        confirmed_expires: momentDate().subtract(5, 'minutes'),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(user);

      return authController.confirmAccount(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(403);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('ExpiredToken');
      });
    });
  });

  describe('Login', () => {
    it('should login a user and return the JWT token', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
          password: 'password',
        },
      };

      const user = {
        uid: '123abc',
        confirmed: true,
        save: sinon.stub().resolves({
          uid: '123abc',
          role: {
            get() {
              return 'user';
            },
          },
        }),
      };

      user.comparePassword = sinon.stub().resolves({ isMatch: true, user });
      userModel.findOne.resolves(user);
      mock.jsonwebtoken.sign.yields(null, 'jwtToken');

      return authController.login(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(user.comparePassword.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('token');
        expect(response.data.token).to.equal('jwtToken');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        comparePassword: sinon.stub(),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(null);

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.comparePassword.calledOnce).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('InvalidCredentials');
      });
    });

    it('should throw an error if the user has not confirmed their account', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        confirmed: false,
        comparePassword: sinon.stub(),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(user);

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.comparePassword.calledOnce).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('NotConfirmed');
      });
    });

    it('should throw an error if the given password does not match the user\'s password', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
          password: 'bad_password',
        },
      };

      const user = {
        uid: '123abc',
        confirmed: true,
        comparePassword: sinon.stub().resolves(false),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(user);

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.comparePassword.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('InvalidCredentials');
      });
    });

    it('should throw an error if the JWT has an error', () => {
      const userModel = mock.models.user;
      const error = {
        name: 'JsonWebTokenError',
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
        save: sinon.stub().resolves({
          uid: '123abc',
          role: {
            get() {
              return 'user';
            },
          },
        }),
      };

      user.comparePassword = sinon.stub().resolves({ isMatch: true, user });
      userModel.findOne.resolves(user);

      mock.jsonwebtoken.sign.yields(error);

      return authController.login(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.comparePassword.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;
        expect(mock.jsonwebtoken.sign.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.name).to.equal('JsonWebTokenError');
      });
    });
  });

  describe('Forgot Password', () => {
    it('should create a reset password token and send forgotten password email', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        uid: '123abc',
        password: 'password',
        confirmed: true,
        save: sinon.stub().resolves({
          uid: '123abc',
          role: {
            get() {
              return 'user';
            },
          },
        }),
      };

      mock.mailer.sendResetPasswordMail.resolves({ user });

      userModel.findOne.resolves(user);

      return authController.forgotPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;
        expect(mock.mailer.sendResetPasswordMail.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        save: sinon.stub(),
      };

      userModel.findOne.resolves(null);

      return authController.forgotPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('InvalidCredentials');
      });
    });

    it('should throw an error if the user has not confirmed their account', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          email: 'mike@mail.com',
        },
      };

      const user = {
        confirmed: false,
        save: sinon.stub(),
      };

      userModel.findOne.resolves(user);

      return authController.forgotPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.false;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('NotConfirmed');
      });
    });
  });

  describe('Reset Password', () => {
    it('should hash and save a user\'s new password and reset password attributes', () => {
      const userModel = mock.models.user;
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
        reset_password_expires: momentDate().subtract(5, 'minutes').format(),
        comparePassword: sinon.stub().resolves(false),
        hashPassword: sinon.stub().resolves('hashed_password'),
        save: sinon.stub().resolves({ uid: '123abc' }),
      };

      userModel.findOne.resolves(user);

      return authController.resetPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(user.comparePassword.calledOnce).to.be.true;
        expect(user.hashPassword.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });

    it('should throw an error if the given user is not found', () => {
      const userModel = mock.models.user;
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
      };

      const user = {
        comparePassword: sinon.stub(),
        hashPassword: sinon.stub(),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(null);

      return authController.resetPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(user.comparePassword.calledOnce).to.be.false;
        expect(user.hashPassword.calledOnce).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(403);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('InvalidCredentials');
      });
    });

    it('should throw an error if the given user\'s reset password token has expired', () => {
      const userModel = mock.models.user;
      const req = {
        query: {
          resetPasswordToken: 'xyz',
        },
      };

      const user = {
        reset_password_expires: momentDate().subtract(5, 'minutes'),
        comparePassword: sinon.stub(),
        hashPassword: sinon.stub(),
        save: sinon.stub(),
      };

      userModel.findOne.resolves(user);

      return authController.resetPassword(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(user.comparePassword.calledOnce).to.be.false;
        expect(user.hashPassword.calledOnce).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(403);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('ExpiredToken');
      });
    });

    it('should not hash and save a user\'s password if it is the same as the current password', () => {
      const userModel = mock.models.user;
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
        reset_password_expires: momentDate().subtract(5, 'minutes').format(),
        hashPassword: sinon.stub(),
        save: sinon.stub().resolves({ uid: '123abc' }),
      };

      user.comparePassword = sinon.stub().resolves({ isMatch: true, user });
      userModel.findOne.resolves(user);

      return authController.resetPassword(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(user.hashPassword.calledOnce).to.be.false;
        expect(user.comparePassword.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid');
        expect(response.data.user.uid).to.equal('123abc');
      });
    });
  });

  describe('Resend Confirmation Email', () => {
    it('should resend the confirmation email', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          uid: '123abc',
        },
      };

      const user = {
        save: sinon.stub().resolves(),
      };

      userModel.findOne.resolves(user);
      mock.mailer.sendConfirmMail.resolves({ user });

      return authController.resendConfirmation(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;
        expect(user.save.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.be.null;
      });
    });

    it('should throw an error if no user is found', () => {
      const userModel = mock.models.user;
      const req = {
        body: {
          uid: '123abc',
        },
      };

      const user = {
        save: sinon.stub().resolves(),
      };

      userModel.findOne.resolves(null);

      return authController.resendConfirmation(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.called).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.data).to.have.all.keys('email');
        expect(response.name).to.equal('InvalidCredentials');
      });
    });

    it('should throw an error if emailClient has an error', () => {
      const userModel = mock.models.user;
      const error = {
        name: 'SparkPostError',
        statusCode: 500,
        errors: [{}],
      };
      const req = {
        body: {
          uid: '123abc',
        },
      };

      const user = {
        save: sinon.stub().resolves(),
      };

      userModel.findOne.resolves(user);
      mock.mailer.sendConfirmMail.rejects(error);

      return authController.resendConfirmation(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;
        expect(user.save.called).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(500);
        expect(response.status).to.equal('error');
        expect(response).to.have.all.keys('status', 'name', 'message', 'data');
        expect(response.name).to.equal('SparkPostError');
      });
    });
  });
});
