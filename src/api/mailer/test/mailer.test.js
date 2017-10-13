/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Mailer', () => {
  let mock;
  let mailerController;
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
        },
      },
      mailer: {
        sendConfirmMail: sinon.stub(),
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
      config: {
        tokens: {
          confirmed: {
            expireTime: 2,
          },
        },
      },
    };

    mailerController = proxyquire('../mailer-controller', {
      '../../models': mock.models,
      'local-mailer': mock.mailer,
      'local-logger': mock.logger,
      config: mock.config,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Confirm Email', () => {
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
      mock.mailer.sendConfirmMail.yields(null, true);

      return mailerController.confirmMail(req, mock.res).then(() => {
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

      return mailerController.confirmMail(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.called).to.be.false;
        expect(user.save.calledOnce).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.name).to.equal('UserNotFound');
      });
    });

    it('should throw an error if emailClient has an error', () => {
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
      mock.mailer.sendConfirmMail.yields(new Error('Error'));

      return mailerController.confirmMail(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.mailer.sendConfirmMail.calledOnce).to.be.true;
        expect(user.save.called).to.be.false;
        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(500);
        expect(response.status).to.equal('error');
        expect(response).to.have.all.keys('status', 'name', 'message');
        expect(response.name).to.equal('Error');
      });
    });
  });
});
