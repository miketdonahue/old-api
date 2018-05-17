/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Mailer', () => {
  let mock;
  let mailerController;
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
        getList: sandbox.stub(),
        updateList: sandbox.stub(),
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
    };

    mailerController = proxyquire('../mailer-controller', {
      'local-mailer': mock.mailer,
      'local-logger': mock.logger,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Update List', () => {
    it('should add a recipient email to a given list', () => {
      const req = {
        params: {
          listId: '123',
        },
        body: {
          email: 'mike@xxxx.com',
        },
      };

      const list = {
        results: {
          id: '123',
          recipients: [],
        },
      };

      mock.mailer.getList.resolves(list);
      mock.mailer.updateList.resolves({});

      return mailerController.updateList(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.getList.calledOnce).to.be.true;

        expect(response).to.have.all.keys('data');
        expect(response.data).to.be.null;
      });
    });

    it('should pass correct arguments to emailClient.updateList', () => {
      mock.mailer.updateList = sinon.spy();
      const req = {
        params: {
          listId: '123',
        },
        body: {
          email: 'mike@xxxx.com',
        },
      };

      const list = {
        results: {
          id: '123',
          recipients: [],
        },
      };

      mock.mailer.getList.resolves(list);

      return mailerController.updateList(req, mock.res).then(() => {
        const listId = '123';
        const recipientList = [{
          address: { email: 'mike@xxxx.com' },
          return_path: 'no-reply@makeitcount.cc',
        }];

        expect(mock.mailer.updateList.calledWith(listId, recipientList)).to.be.true;
      });
    });

    it('should throw an error if emailClient.getList has an error', () => {
      const req = {
        params: {
          listId: '123',
        },
      };

      mock.mailer.getList.rejects();

      return mailerController.updateList(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.getList.calledOnce).to.be.true;

        expect(status).to.equal('500');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('500');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('SERVER_ERROR');
      });
    });

    it('should throw an error if emailClient.updateList has an error', () => {
      const req = {
        params: {
          listId: '123',
        },
        body: {
          email: 'mike@xxxx.com',
        },
      };

      const list = {
        results: {
          id: '123',
          recipients: [],
        },
      };

      mock.mailer.getList.resolves(list);
      mock.mailer.updateList.rejects();

      return mailerController.updateList(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;
        expect(mock.mailer.getList.calledOnce).to.be.true;

        expect(status).to.equal('500');
        expect(response).to.have.all.keys('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(response.errors[0].statusCode).to.equal('500');
        expect(response.errors[0].message).to.be.a('string');
        expect(response.errors[0].code).to.equal('SERVER_ERROR');
      });
    });
  });
});
