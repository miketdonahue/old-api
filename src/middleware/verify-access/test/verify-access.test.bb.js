/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const expect = require('chai').expect;
const config = require('config');
const exec = require('child_process').exec;
const request = require('supertest')(app);

const User = require('../../../models').user;

describe('Black Box Test: Verify-Access', () => {
  beforeEach((done) => {
    exec('NODE_ENV=test yarn seed', (error) => {
      done(error);
    });
  });

  afterEach((done) => {
    exec('NODE_ENV=test yarn seed:undo:all', (error) => {
      done(error);
    });
  });

  it('should returns users if the requester has the correct access to the resource', (done) => {
    config.verifyAccess = true;
    config.jwt = {
      secret: process.env.JWT_SECRET,
      expireTime: '1h',
    };

    User.findOne({ where: { confirmed: false } }).then((obj) => {
      const user = obj;

      user.role_id = 2; // admin role id
      user.save();

      request
        .post('/api/auth/confirm-account')
        .query({ confirmToken: user.confirmed_token })
        .expect(200)
        .end(() => {
          request
            .post('/api/auth/login')
            .send({
              email: user.email,
              password: 'password',
            })
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              request
                .get('/api/users')
                .set('Authorization', `Bearer ${body.data.token}`)
                .expect(200)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('success');
                  expect(resBody.data).to.have.all.keys('users');
                  expect(resBody.data.users).to.be.an('array');
                  expect(resBody.data.users).to.have.lengthOf(10);

                  done(err);
                });
            });
        });
    });
  });

  it('should throw an error if the requester does not have access to the resource', (done) => {
    config.verifyAccess = true;
    config.jwt = {
      secret: process.env.JWT_SECRET,
      expireTime: '1h',
    };

    User.findOne({ where: { confirmed: false } }).then((user) => {
      request
        .post('/api/auth/confirm-account')
        .query({ confirmToken: user.confirmed_token })
        .expect(200)
        .end(() => {
          request
            .post('/api/auth/login')
            .send({
              email: user.email,
              password: 'password',
            })
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              request
                .get('/api/users')
                .set('Authorization', `Bearer ${body.data.token}`)
                .expect(403)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('fail');
                  expect(resBody).to.have.all.keys('status', 'name', 'data', 'message');
                  expect(resBody.data).to.have.all.keys('user');
                  expect(resBody.name).to.equal('Unauthorized');

                  done(e);
                });
            });
        });
    });
  });
});
