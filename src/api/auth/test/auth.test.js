/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');

const authController = require('../auth-controller');
const User = require('../../../models').user;

describe('Unit Test: Auth', () => {
  let mock;

  beforeEach(() => {
    mock = {
      req: {},
      res: {
        status: sinon.spy(() => mock.res),
        json: sinon.spy(),
      },
      model: {
        findOne: sinon.stub(User, 'findOne'),
        create: sinon.stub(User, 'create'),
      },
    };
  });

  describe('Signup', () => {
    it.only('should create a new user if the given email does not exist', () => {
      const req = {
        body: {
          email: 'mike@mail.com',
          firstName: 'Mike',
          lastName: 'James',
          password: 'password',
          ip: '0.0.0.0',
        },
      };

      mock.model.findOne.resolves(null);
      mock.model.create.resolves({});

      return authController.signup(req, mock.res).then(() => {
        expect(mock.res.json.called).to.be.true;
      });
    });
  });
});
