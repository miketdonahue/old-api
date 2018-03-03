/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const expect = require('chai').expect;
const config = require('config');
const exec = require('child_process').exec;
const request = require('supertest')(app);

const User = require('../../../models').user;

describe('Black Box Test: Verify-Jwt', () => {
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

  it('should returns users if Authorization header with correct JWT given', (done) => {
    config.auth.jwt = {
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
                .get(`/api/users/${user.uid}`)
                .set('Authorization', `Bearer ${body.data.token}`)
                .expect(200)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('success');
                  expect(resBody.data).to.have.all.keys('user');
                  expect(resBody.data.user).to.be.an('object');

                  done(err);
                });
            });
        });
    });
  });

  it('should throw an error if Authorization header contains a malformed JWT', (done) => {
    config.auth.jwt = {
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
            .end(() => {
              request
                .get(`/api/users/${user.uid}`)
                .expect(400)
                .end((err, response) => {
                  const body = response.body;

                  expect(body.status).to.equal('fail');
                  expect(body).to.have.all.keys('status', 'name', 'message', 'data');
                  expect(body.name).to.equal('JsonWebTokenError');

                  done(err);
                });
            });
        });
    });
  });
});
