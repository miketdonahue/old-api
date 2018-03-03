/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Verify JWT Middleware', () => {
  let mock;
  let verifyJwtMiddleware;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    mock = {
      req: {},
      res: {
        locals: {},
      },
      jsonwebtoken: {
        verify: sinon.stub(),
      },
      config: {
        auth: {
          jwt: {
            secret: 'secret',
          },
        },
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
      },
      nextSpy: sinon.spy(),
    };

    verifyJwtMiddleware = proxyquire('../verify-jwt', {
      'local-logger': mock.logger,
      jsonwebtoken: mock.jsonwebtoken,
      config: mock.config,
    })();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Verify JWT', () => {
    it('should verify the JWT token and attach the decoded user to res.locals', (done) => {
      const req = {
        headers: {
          authorization: 'Bearer',
        },
      };

      mock.jsonwebtoken.verify.yields(null, {
        uid: '123abc',
        role: 'user',
      });

      verifyJwtMiddleware(req, mock.res, () => {
        expect(mock.jsonwebtoken.verify.calledOnce).to.be.true;
        expect(mock.res.locals).to.have.all.keys('user');
        expect(mock.res.locals.user).to.have.all.keys('uid', 'role');
        done();
      });
    });

    it('should called next if no errors present', () => {
      const req = {
        headers: {
          authorization: 'Bearer token',
        },
      };

      mock.jsonwebtoken.verify.yields(null, {});
      verifyJwtMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
    });

    it('should throw an error if jwt.verify has an error', () => {
      const req = {
        headers: {
          authorization: 'Bearer token',
        },
      };

      mock.jsonwebtoken.verify.yields('error');
      verifyJwtMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.nextSpy.calledWith('error')).to.be.true;
    });

    it('should throw an error if req.headers not present', () => {
      const req = {
        headers: {},
      };

      mock.jsonwebtoken.verify.yields('no headers');
      verifyJwtMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.nextSpy.calledWith('no headers')).to.be.true;
    });

    it('should throw an error if \'Bearer\' is not present in authorization header', () => {
      const req = {
        headers: {
          authorization: 'bad header',
        },
      };

      mock.jsonwebtoken.verify.yields('no Bearer present');
      verifyJwtMiddleware(req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.nextSpy.calledWith('no Bearer present')).to.be.true;
    });

    it('should call next if config.auth.jwt is set to false', () => {
      mock.config.auth.jwt = false;

      verifyJwtMiddleware(mock.req, mock.res, mock.nextSpy);

      expect(mock.nextSpy.calledOnce).to.be.true;
      expect(mock.jsonwebtoken.verify.called).to.be.false;
    });
  });
});
