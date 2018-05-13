/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Verify Access Middleware', () => {
  let mock;
  let verifyAccessMiddleware;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mock = {
      req: {},
      res: {
        locals: {
          user: {
            uid: '123abc',
          },
        },
      },
      getPermissions: sinon.stub(),
      config: {
        auth: {
          verifyAccess: {},
        },
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
      nextSpy: sinon.spy(),
    };

    verifyAccessMiddleware = proxyquire('../verify-access', {
      './access': mock.getPermissions,
      'local-logger': mock.logger,
      config: mock.config,
    })();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Verify Access', () => {
    it('should verify the user\'s access and call next if permissions were granted', () => {
      const req = {
        params: {
          uid: '123abc',
        },
      };

      mock.getPermissions.returns({ granted: true });
      verifyAccessMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
    });

    it('should throw an error if no user is present on res.locals', () => {
      mock.res.locals = {};

      const req = {
        params: {
          uid: '123abc',
        },
      };

      verifyAccessMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.nextSpy.calledWith({
        name: 'AppError',
        message: 'No user was found on res.locals',
        statusCode: '500',
        errors: [{
          statusCode: '500',
          message: 'No user was found on res.locals',
          code: 'USER_NOT_FOUND',
          source: { path: 'data/user' },
        }],
      })).to.be.true;
    });

    it('should throw an error if the user was not granted permissions', () => {
      const req = {
        params: {
          uid: '123abc',
        },
      };

      mock.getPermissions.returns({ granted: false });
      verifyAccessMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.nextSpy.calledWith({
        name: 'AppError',
        message: 'The user is not authorized for this resource',
        statusCode: '403',
        errors: [{
          statusCode: '403',
          message: 'The user is not authorized for this resource',
          code: 'UNAUTHORIZED',
          source: { path: 'data/user' },
        }],
      })).to.be.true;
    });

    it('should call next if config.auth.jwt is set to false', () => {
      mock.config.auth.verifyAccess = false;

      verifyAccessMiddleware(mock.req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
    });
  });
});
