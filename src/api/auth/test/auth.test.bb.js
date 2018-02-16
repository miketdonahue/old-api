/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const expect = require('chai').expect;
const shortId = require('shortid');
const momentDate = require('moment');
const exec = require('child_process').exec;
const config = require('config');
const request = require('supertest')(app);

const User = require('../../../models').user;

// TODO: Helper that confirms account so downstream actions can be taken

describe('Black Box Test: Auth', () => {
  beforeEach((done) => {
    exec('NODE_ENV=test yarn seed', (error) => {
      done(error);
    });
  });

  afterEach((done) => {
    exec('NODE_ENV=test yarn seed:undo:all', (error) => {
      config.jwt = false;

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
          const lowTime = momentDate().add(2, 'hours').subtract(1, 'minutes');
          const highTime = momentDate().add(2, 'hours').add(1, 'minutes');

          expect(body.status).to.equal('success');
          expect(body.data).to.have.all.keys('user');
          expect(body.data.user).to.have.all.keys('uid');
          expect(shortId.isValid(body.data.user.uid)).to.be.true;
          expect(body.data.user.uid).to.have.lengthOf.within(7, 14);

          User.findOne({ where: { email: 'mike@xxxxxxxx.com' } }).then((user) => {
            expect(user.first_name).to.equal('michael');
            expect(user.last_name).to.equal('jones');
            expect(user.email).to.equal('mike@xxxxxxxx.com');

            expect(user.confirmed_token).is.not.null;
            expect(user.confirmed_expires).is.not.null;
            expect(momentDate(user.confirmed_expires)
              .isBetween(lowTime, highTime)).to.be.true;

            done(err);
          });
        });
    });

    it('should throw an error if user already created', (done) => {
      User.findOne({ where: { confirmed: false } }).then((user) => {
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
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('email');
            expect(body.name).to.equal('UserExists');

            done(err);
          });
      });
    });
  });

  describe('POST /api/auth/confirm-account', () => {
    it('should confirm a user\'s account', (done) => {
      User.findOne({ where: { confirmed: false } }).then((user) => {
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

            User.findOne({ where: { uid: body.data.user.uid } }).then((selectedUser) => {
              expect(selectedUser.confirmed).to.equal(true);
              expect(selectedUser.confirmed_token).to.be.null;
              expect(selectedUser.confirmed_expires).to.be.null;

              done(err);
            });
          });
      });
    });

    it('should throw an error if user not found', (done) => {
      User.findOne({ where: { confirmed_token: 'xyz' } }).then(() => {
        request
          .post('/api/auth/confirm-account')
          .expect(403)
          .end((err, response) => {
            const body = response.body;

            expect(body.status).to.equal('fail');
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('user');
            expect(body.name).to.equal('UserNotFound');

            done(err);
          });
      });
    });

    it('should throw an error if the user\'s token has expired', (done) => {
      config.jwt = {
        secret: process.env.JWT_SECRET,
        expireTime: '1h',
      };

      User.findOne({ where: { confirmed: false } }).then((obj) => {
        const user = obj;

        user.confirmed_expires = momentDate().subtract(3, 'hours');
        user.save();

        request
          .post('/api/auth/confirm-account')
          .query({ confirmToken: user.confirmed_token })
          .expect(403)
          .end((err, response) => {
            const body = response.body;

            expect(body.status).to.equal('fail');
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('user');
            expect(body.name).to.equal('ExpiredToken');

            done(err);
          });
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user', (done) => {
      config.jwt = {
        secret: process.env.JWT_SECRET,
        expireTime: '1h',
      };

      User.findOne({ where: { confirmed: false } }).then((user) => {
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
                const lowTime = momentDate().subtract(1, 'minutes');
                const highTime = momentDate().add(1, 'minutes');

                expect(resBody.status).to.equal('success');
                expect(resBody.data).to.have.all.keys('token');

                User.findOne({ where: { uid: body.data.user.uid } }).then((selectedUser) => {
                  expect(momentDate(selectedUser.last_visit)
                    .isBetween(lowTime, highTime)).to.be.true;

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
          expect(body).to.have.all.keys('status', 'name', 'data', 'message');
          expect(body.data).to.have.all.keys('email');
          expect(body.name).to.equal('InvalidCredentials');

          done(err);
        });
    });

    it('should throw an error if user\'s account is not confirmed', (done) => {
      User.findOne({ where: { confirmed: false } }).then((user) => {
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
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('email');
            expect(body.name).to.equal('NotConfirmed');

            done(err);
          });
      });
    });

    it('should throw an error if user\'s password does not match', (done) => {
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
                password: 'bad_password',
              })
              .expect(400)
              .end((e, res) => {
                const resBody = res.body;

                expect(resBody.status).to.equal('fail');
                expect(resBody).to.have.all.keys('status', 'name', 'data', 'message');
                expect(resBody.data).to.have.all.keys('user');
                expect(resBody.name).to.equal('InvalidCredentials');

                done(e);
              });
          });
      });
    });

    it('should throw an error if JWT not provided', (done) => {
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
      User.findOne({ where: { confirmed: false } }).then((user) => {
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
                const lowTime = momentDate().add(2, 'hours').subtract(1, 'minutes');
                const highTime = momentDate().add(2, 'hours').add(1, 'minutes');

                expect(resBody.status).to.equal('success');
                expect(resBody.data).to.have.all.keys('user');
                expect(resBody.data.user).to.have.all.keys('uid');
                expect(shortId.isValid(resBody.data.user.uid)).to.be.true;
                expect(resBody.data.user.uid).to.have.lengthOf.within(7, 14);

                User.findOne({ where: { uid: body.data.user.uid } }).then((selectedUser) => {
                  expect(selectedUser.reset_password_token).is.not.null;
                  expect(selectedUser.reset_password_expires).is.not.null;
                  expect(momentDate(selectedUser.reset_password_expires)
                    .isBetween(lowTime, highTime)).to.be.true;

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
          expect(body).to.have.all.keys('status', 'name', 'data', 'message');
          expect(body.data).to.have.all.keys('email');
          expect(body.name).to.equal('InvalidCredentials');

          done(err);
        });
    });

    it('should throw an error if user\'s account is not confirmed', (done) => {
      User.findOne({ where: { confirmed: false } }).then((user) => {
        request
          .post('/api/auth/forgot-password')
          .send({
            email: user.email,
          })
          .expect(400)
          .end((err, response) => {
            const body = response.body;

            expect(body.status).to.equal('fail');
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('email');
            expect(body.name).to.equal('NotConfirmed');

            done(err);
          });
      });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password for the user', (done) => {
      User.findOne({ where: { confirmed: false } }).then((user) => {
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
                User.findOne({ where: { uid: user.uid } }).then((selectedUser) => {
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

                      User.findOne({ where: { uid: selectedUser.uid } }).then((updatedUser) => {
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
      User.findOne({ where: { confirmed_token: 'xyz' } }).then(() => {
        request
          .post('/api/auth/reset-password')
          .expect(403)
          .end((err, response) => {
            const body = response.body;

            expect(body.status).to.equal('fail');
            expect(body).to.have.all.keys('status', 'name', 'data', 'message');
            expect(body.data).to.have.all.keys('user');
            expect(body.name).to.equal('InvalidCredentials');

            done(err);
          });
      });
    });

    it('should throw an error if the user\'s token has expired', (done) => {
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
              .post('/api/auth/forgot-password')
              .send({
                email: user.email,
              })
              .expect(200)
              .end(() => {
                User.findOne({ where: { uid: user.uid } }).then((userObj) => {
                  const selectedUser = userObj;

                  selectedUser.reset_password_expires = momentDate().subtract(3, 'hours');
                  selectedUser.save();

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
                      expect(body).to.have.all.keys('status', 'name', 'data', 'message');
                      expect(body.data).to.have.all.keys('user');
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
