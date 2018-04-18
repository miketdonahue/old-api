/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const { expect } = require('chai');
const shortId = require('shortid');
const addHours = require('date-fns/add_hours');
const subtractHours = require('date-fns/sub_hours');
const isWithinRange = require('date-fns/is_within_range');
const isBefore = require('date-fns/is_before');
const { exec } = require('child_process');
const config = require('config');
const request = require('supertest')(app);

const User = require('../../../models/user');

// TODO: Helper that confirms account so downstream actions can be taken

describe('Black Box Test: Auth', () => {
  beforeEach((done) => {
    exec('NODE_ENV=test yarn migrate && yarn seed', (error) => {
      done(error);
    });
  });

  afterEach((done) => {
    exec('NODE_ENV=test yarn migrate:undo', (error) => {
      config.auth.jwt = false;

      done(error);
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user', (done) => {
      request
        .post('/api/auth/signup')
        .send({
          email: 'mike@xxxxxxxx.com',
          firstName: 'michael',
          lastName: 'jones',
          password: 'password',
        })
        .expect(201)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('success');
          expect(body.data).to.have.all.keys('user');
          expect(body.data.user).to.have.all.keys('uid');
          expect(shortId.isValid(body.data.user.uid)).to.be.true;
          expect(body.data.user.uid).to.have.lengthOf.within(7, 14);

          User.knex()
            .where({ email: 'mike@xxxxxxxx.com' })
            .first()
            .then((user) => {
              expect(user.first_name).to.equal('michael');
              expect(user.last_name).to.equal('jones');
              expect(user.email).to.equal('mike@xxxxxxxx.com');

              expect(user.confirmed_token).is.not.null;
              expect(user.confirmed_expires).is.not.null;
              expect(isBefore(new Date(user.confirmed_expires),
                addHours(new Date(), 3))).to.be.true;

              done(err);
            });
        });
    });

    it('should throw an error if user already created', (done) => {
      User.knex()
        .where({ confirmed: false })
        .first()
        .then((user) => {
          request
            .post('/api/auth/signup')
            .send({
              email: user.email,
              firstName: 'michael',
              lastName: 'jones',
              password: 'password',
            })
            .expect(400)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('fail');
              expect(body).to.have.all.keys('status', 'name', 'data');
              expect(body.data).to.have.all.keys('email');
              expect(body.name).to.equal('UserExists');

              done(err);
            });
        });
    });
  });

  describe('POST /api/auth/confirm-account', () => {
    it('should confirm a user\'s account', (done) => {
      User.knex()
        .where({ confirmed: false })
        .first()
        .then((user) => {
          request
            .post('/api/auth/confirm-account')
            .query({ confirmToken: user.confirmed_token })
            .expect(200)
            .end((err, response) => {
              const body = response.body;
              expect(body.status).to.equal('success');
              expect(body.data).to.have.all.keys('user');
              expect(body.data.user).to.have.all.keys('uid');
              expect(shortId.isValid(body.data.user.uid)).to.be.true;
              expect(body.data.user.uid).to.have.lengthOf.within(7, 14);

              User.knex()
                .where({ uid: body.data.user.uid })
                .first()
                .then((selectedUser) => {
                  expect(selectedUser.confirmed).to.equal(1);
                  expect(selectedUser.confirmed_token).to.be.null;
                  expect(selectedUser.confirmed_expires).to.be.null;

                  done(err);
                });
            });
        });
    });

    it('should throw an error if user\'s token not found', (done) => {
      request
        .post('/api/auth/confirm-account')
        .query({ confirmToken: null })
        .expect(403)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('token');
          expect(body.name).to.equal('TokenNotFound');

          done(err);
        });
    });

    it('should throw an error if the user\'s token has expired', (done) => {
      config.auth.jwt = {
        secret: process.env.JWT_SECRET,
        expireTime: '1h',
      };

      User.knex()
        .where({ confirmed: false })
        .first()
        .then((obj) => {
          const user = obj;

          User.update(user, {
            confirmed_expires: subtractHours(new Date(), 3),
          });

          request
            .post('/api/auth/confirm-account')
            .query({ confirmToken: user.confirmed_token })
            .expect(403)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('fail');
              expect(body).to.have.all.keys('status', 'name', 'data');
              expect(body.data).to.have.all.keys('token');
              expect(body.name).to.equal('ExpiredToken');

              done(err);
            });
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user', (done) => {
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
            .end((err, response) => {
              const body = response.body;

              request
                .post('/api/auth/login')
                .send({
                  email: user.email,
                  password: 'password',
                })
                .expect(200)
                .end((e, res) => {
                  const resBody = res.body;
                  const lowTime = subtractHours(new Date(), 1);
                  const highTime = addHours(new Date(), 1);

                  expect(resBody.status).to.equal('success');
                  expect(resBody.data).to.have.all.keys('token');

                  User.knex()
                    .where({ uid: body.data.user.uid })
                    .first()
                    .then((selectedUser) => {
                      expect(isWithinRange(selectedUser.last_visit, lowTime, highTime)).to.be.true;

                      done(e);
                    });
                });
            });
        });
    });

    it('should throw an error if user not found', (done) => {
      request
        .post('/api/auth/login')
        .send({
          email: null,
          password: 'password',
        })
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('email');
          expect(body.name).to.equal('InvalidCredentials');

          done(err);
        });
    });

    it('should throw an error if user\'s account is not confirmed', (done) => {
      User.knex()
        .where({ confirmed: false })
        .first()
        .then((user) => {
          request
            .post('/api/auth/login')
            .send({
              email: user.email,
              password: 'password',
            })
            .expect(400)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('fail');
              expect(body).to.have.all.keys('status', 'name', 'data');
              expect(body.data).to.have.all.keys('email');
              expect(body.name).to.equal('NotConfirmed');

              done(err);
            });
        });
    });

    it('should throw an error if user\'s password does not match', (done) => {
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
                  password: 'bad_password',
                })
                .expect(400)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('fail');
                  expect(resBody).to.have.all.keys('status', 'name', 'data');
                  expect(resBody.data).to.have.all.keys('user');
                  expect(resBody.name).to.equal('InvalidCredentials');

                  done(e);
                });
            });
        });
    });

    it('should throw an error if JWT not provided', (done) => {
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
                .expect(500)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('error');
                  expect(resBody).to.have.all.keys('status', 'message', 'name', 'data');
                  expect(resBody.name).to.equal('Error');

                  done(e);
                });
            });
        });
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should set a reset password token for the user', (done) => {
      User.knex()
        .where({ confirmed: false })
        .first()
        .then((user) => {
          request
            .post('/api/auth/confirm-account')
            .query({ confirmToken: user.confirmed_token })
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              request
                .post('/api/auth/forgot-password')
                .send({
                  email: user.email,
                })
                .expect(200)
                .end((e, res) => {
                  const resBody = res.body;

                  expect(resBody.status).to.equal('success');
                  expect(resBody.data).to.have.all.keys('user');
                  expect(resBody.data.user).to.have.all.keys('uid');
                  expect(shortId.isValid(resBody.data.user.uid)).to.be.true;
                  expect(resBody.data.user.uid).to.have.lengthOf.within(7, 14);

                  User.knex()
                    .where({ uid: body.data.user.uid })
                    .first()
                    .then((selectedUser) => {
                      expect(selectedUser.reset_password_token).is.not.null;
                      expect(selectedUser.reset_password_expires).is.not.null;
                      expect(isBefore(new Date(selectedUser.reset_password_expires),
                        addHours(new Date(), 3))).to.be.true;

                      done(e);
                    });
                });
            });
        });
    });

    it('should throw an error if user not found', (done) => {
      request
        .post('/api/auth/forgot-password')
        .send({
          email: null,
        })
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('email');
          expect(body.name).to.equal('InvalidCredentials');

          done(err);
        });
    });

    it('should throw an error if user\'s account is not confirmed', (done) => {
      User.knex()
        .where({ confirmed: false })
        .first()
        .then((user) => {
          request
            .post('/api/auth/forgot-password')
            .send({
              email: user.email,
            })
            .expect(400)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('fail');
              expect(body).to.have.all.keys('status', 'name', 'data');
              expect(body.data).to.have.all.keys('email');
              expect(body.name).to.equal('NotConfirmed');

              done(err);
            });
        });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password for the user', (done) => {
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
                .post('/api/auth/forgot-password')
                .send({
                  email: user.email,
                })
                .expect(200)
                .end(() => {
                  User.knex()
                    .where({ uid: user.uid })
                    .first()
                    .then((selectedUser) => {
                      request
                        .post('/api/auth/reset-password')
                        .query({ resetPasswordToken: selectedUser.reset_password_token })
                        .send({
                          password: 'password1',
                        })
                        .expect(200)
                        .end((err, response) => {
                          const body = response.body;

                          expect(body.status).to.equal('success');
                          expect(body.data).to.have.all.keys('user');
                          expect(body.data.user).to.have.all.keys('uid');
                          expect(shortId.isValid(body.data.user.uid)).to.be.true;
                          expect(body.data.user.uid).to.have.lengthOf.within(7, 14);

                          User.knex()
                            .where({ uid: selectedUser.uid })
                            .first()
                            .then((updatedUser) => {
                              expect(updatedUser.reset_password_token).is.null;
                              expect(updatedUser.reset_password_expires).is.null;
                              expect(selectedUser.password).to.not.equal(updatedUser.password);

                              done(err);
                            });
                        });
                    });
                });
            });
        });
    });

    it('should throw an error if user not found', (done) => {
      request
        .post('/api/auth/reset-password')
        .query({ resetPasswordToken: null })
        .expect(403)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('token');
          expect(body.name).to.equal('TokenNotFound');

          done(err);
        });
    });

    it('should throw an error if the user\'s token has expired', (done) => {
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
                .post('/api/auth/forgot-password')
                .send({
                  email: user.email,
                })
                .expect(200)
                .end(() => {
                  User.knex()
                    .where({ uid: user.uid })
                    .first()
                    .then((userObj) => {
                      const selectedUser = userObj;

                      User.update(selectedUser, {
                        reset_password_expires: subtractHours(new Date(), 3),
                      });

                      request
                        .post('/api/auth/reset-password')
                        .query({ resetPasswordToken: selectedUser.reset_password_token })
                        .send({
                          password: 'password1',
                        })
                        .expect(403)
                        .end((err, response) => {
                          const body = response.body;

                          expect(body.status).to.equal('fail');
                          expect(body).to.have.all.keys('status', 'name', 'data');
                          expect(body.data).to.have.all.keys('token');
                          expect(body.name).to.equal('ExpiredToken');

                          done(err);
                        });
                    });
                });
            });
        });
    });
  });
});
