/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const { expect } = require('chai');
const config = require('config');
const { exec } = require('child_process');
const request = require('supertest')(app);
const UserModel = require('../../../models/user');

const User = new UserModel();

describe('Black Box Test: Verify-Access', () => {
  beforeEach((done) => {
    exec('NODE_ENV=test yarn migrate && yarn seed', (error) => {
      done(error);
    });
  });

  afterEach((done) => {
    exec('NODE_ENV=test yarn migrate:undo', (error) => {
      done(error);
    });
  });

  it('should returns users if the requester has the correct access to the resource', (done) => {
    config.auth.verifyAccess = true;
    config.auth.jwt = {
      secret: process.env.JWT_SECRET,
      expireTime: '1h',
    };

    User.knex()
      .where({ confirmed: false })
      .first()
      .then((obj) => {
        const user = obj;

        return User.update(user, { role_id: 2 }) // admin role id
          .then((updatedUser) => {
            request
              .post('/api/auth/confirm-account')
              .query({ confirmToken: updatedUser.confirmed_token })
              .expect(200)
              .end(() => {
                request
                  .post('/api/auth/login')
                  .send({
                    email: updatedUser.email,
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

                        expect(resBody.data).to.have.all.keys('users');
                        expect(resBody.data.users).to.be.an('array');
                        expect(resBody.data.users).to.have.lengthOf(5);

                        done(err);
                      });
                  });
              });
          });
      });
  });

  it('should throw an error if the requester does not have access to the resource', (done) => {
    config.auth.verifyAccess = true;
    config.auth.jwt = {
      secret: process.env.JWT_SECRET,
      expireTime: '1h',
    };

    User.knex()
      .where({ confirmed: false })
      .first()
      .then((user) => {
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

                    expect(resBody).to.have.all.keys('errors');
                    expect(resBody.errors).to.be.an('array');
                    expect(resBody.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
                    expect(resBody.errors[0].statusCode).to.equal('403');
                    expect(resBody.errors[0].message).to.be.a('string');
                    expect(resBody.errors[0].code).to.equal('UNAUTHORIZED');
                    expect(resBody.errors[0].source).to.be.an('object');
                    expect(resBody.errors[0].source).to.have.all.keys('path');
                    expect(resBody.errors[0].source.path).to.equal('data/user');

                    done(e);
                  });
              });
          });
      });
  });
});
