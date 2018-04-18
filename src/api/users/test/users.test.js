/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Users', () => {
  let mock;
  let userController;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    mock = {
      req: {},
      res: {
        status: sinon.spy(() => mock.res),
        json: sinon.spy(),
      },
      userModel: {
        knex: sandbox.stub().returnsThis(),
        whereNull: sandbox.stub(),
        orderBy: sandbox.stub(),
        select: sandbox.stub(),
        where: sandbox.stub(),
        first: sandbox.stub(),
        update: sandbox.stub(),
        comparePassword: sandbox.stub(),
        hashPassword: sandbox.stub(),
      },
      logger: {
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
      },
    };

    userController = proxyquire('../users-controller', {
      '../../models/user': mock.userModel,
      'local-logger': mock.logger,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('List All Users', () => {
    it('should return a list of all users', () => {
      const userModel = mock.userModel;

      const users = [
        {
          uid: '',
          first_name: '',
          last_name: '',
          email: '',
          last_visit: '',
          created_at: '',
          updated_at: '',
          deleted_at: '',
        },
      ];

      userModel.whereNull.returnsThis();
      userModel.orderBy.returnsThis();
      userModel.select.resolves(users);

      return userController.list(mock.req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('users');
        expect(response.data.users).to.be.an('array');
        expect(response.data.users[0]).to.have.all.keys(
          [
            'uid',
            'first_name',
            'last_name',
            'email',
            'last_visit',
            'created_at',
            'updated_at',
            'deleted_at',
          ],
        );
      });
    });

    it('should throw an error if no users were found', () => {
      const userModel = mock.userModel;

      userModel.whereNull.returnsThis();
      userModel.orderBy.returnsThis();
      userModel.select.resolves([]);

      return userController.list(mock.req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'data');
        expect(response.data).to.have.all.keys('users');
        expect(response.name).to.equal('NoUsersFound');
      });
    });
  });

  describe('Show User', () => {
    it('should return a single user given the user\'s uid', () => {
      const userModel = mock.userModel;
      const req = {
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.returnsThis();
      userModel.select.resolves(user);

      return userController.show(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.be.an('object');
      });
    });

    it('should throw an error if no user was found', () => {
      const userModel = mock.userModel;
      const req = {
        params: {
          uid: '123abc',
        },
      };

      userModel.where.returnsThis();
      userModel.first.returnsThis();
      userModel.select.resolves(null);

      return userController.show(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'data');
        expect(response.data).to.have.all.keys('uid');
        expect(response.name).to.equal('UserNotFound');
      });
    });
  });

  describe('Update User', () => {
    it('should update a user\'s updatable attributes', () => {
      const userModel = mock.userModel;
      const req = {
        body: {
          firstName: 'Mike',
          lastName: 'James',
          email: 'mike@mail.com',
          password: 'password',
        },
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.resolves(user);
      userModel.comparePassword.resolves({ isMatch: true, user });
      userModel.update.resolves(user);

      return userController.update(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(userModel.comparePassword.calledOnce).to.be.true;
        expect(userModel.hashPassword.called).to.be.false;
        expect(userModel.update.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid', 'first_name', 'last_name', 'email', 'last_visit', 'created_at', 'updated_at', 'deleted_at');
      });
    });

    it('should hash a user\'s new password', () => {
      const userModel = mock.userModel;
      const req = {
        body: {
          firstName: 'Mike',
          lastName: 'James',
          email: 'mike@mail.com',
          password: 'new_password',
        },
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.resolves(user);
      userModel.comparePassword.resolves({ isMatch: false, user });
      userModel.hashPassword.resolves({ hashedPassword: 'new_password', user });
      userModel.update.resolves(user);

      return userController.update(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.json.calledOnce).to.be.true;
        expect(userModel.comparePassword.calledOnce).to.be.true;
        expect(userModel.hashPassword.calledOnce).to.be.true;
        expect(userModel.update.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.have.all.keys('user');
        expect(response.data.user).to.have.all.keys('uid', 'first_name', 'last_name', 'email', 'last_visit', 'created_at', 'updated_at', 'deleted_at');
      });
    });

    it('should not return non-whitelisted fields in JSON response', () => {
      const userModel = mock.userModel;
      const req = {
        body: {
          firstName: 'Mike',
        },
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.resolves(user);
      userModel.comparePassword.resolves({ isMatch: false, user });
      userModel.hashPassword.resolves({ hashedPassword: 'new_password', user });
      userModel.update.resolves(user);

      return userController.update(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(response.data.user).to.not.have.any.keys('fake_field');
      });
    });

    it('should not compare the password if the user is not changing the password', () => {
      const userModel = mock.userModel;
      const req = {
        body: {
          firstName: 'Mike',
        },
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.resolves(user);

      userModel.update = sinon.spy();

      return userController.update(req, mock.res).then(() => {
        expect(userModel.comparePassword.called).to.be.false;
        expect(userModel.hashPassword.called).to.be.false;
        expect(userModel.update.getCall(0).args[1]).to.deep.equal({
          first_name: 'Mike',
          last_name: undefined,
          email: undefined,
          password: undefined,
        });
        expect(mock.res.json.calledOnce).to.be.true;
      });
    });

    it('should throw an error if no user is found', () => {
      const userModel = mock.userModel;
      const req = {
        body: {
          firstName: 'Mike',
          lastName: 'James',
          email: 'mike@mail.com',
          password: 'password',
        },
        params: {
          uid: '123abc',
        },
      };

      userModel.where.returnsThis();
      userModel.first.resolves(null);

      return userController.update(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'data');
        expect(response.data).to.have.all.keys('uid');
        expect(response.name).to.equal('UserNotFound');
      });
    });
  });

  describe('Destroy User', () => {
    it('should mark a user as deleted', () => {
      const userModel = mock.userModel;
      const req = {
        params: {
          uid: '123abc',
        },
      };

      const user = {
        uid: '123abc',
      };

      userModel.where.returnsThis();
      userModel.first.resolves(user);
      userModel.update.resolves(user);

      return userController.destroy(req, mock.res).then(() => {
        const response = mock.res.json.getCall(0).args[0];

        expect(userModel.update.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(response.status).to.equal('success');
        expect(response).to.have.all.keys('status', 'data');
        expect(response.data).to.be.null;
      });
    });

    it('should throw an error if no user was found', () => {
      const userModel = mock.userModel;
      const req = {
        params: {
          uid: '123abc',
        },
      };

      userModel.where.returnsThis();
      userModel.first.resolves(null);

      return userController.destroy(req, mock.res).then(() => {
        const status = mock.res.status.getCall(0).args[0];
        const response = mock.res.json.getCall(0).args[0];

        expect(mock.res.status.calledOnce).to.be.true;
        expect(mock.res.json.calledOnce).to.be.true;

        expect(status).to.equal(400);
        expect(response.status).to.equal('fail');
        expect(response).to.have.all.keys('status', 'name', 'data');
        expect(response.data).to.have.all.keys('uid');
        expect(response.name).to.equal('UserNotFound');
      });
    });
  });
});
