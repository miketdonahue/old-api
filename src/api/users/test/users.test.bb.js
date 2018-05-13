/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const { expect } = require('chai');
const { exec } = require('child_process');
const request = require('supertest')(app);

const User = require('../../../models/user');

describe.skip('Black Box Test: Users', () => {
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

  describe('GET /api/users', () => {
    it('should return a list of users', (done) => {
      request
        .get('/api/users')
        .expect(200)
        .end((err, response) => {
          const body = response.body;

          // TODO: to not have a fake key not in whitelist & to be in ASC order
          expect(body.status).to.equal('success');
          expect(body.data).to.have.all.keys('users');
          expect(body.data.users).to.be.an('array');
          expect(body.data.users[0]).to.be.an('object');
          expect(body.data.users[0]).to.have.all.keys('uid', 'first_name', 'last_name', 'email', 'last_visit', 'created_at', 'updated_at', 'deleted_at');
          expect(body.data.users[0].deleted_at).to.be.null;
          expect(body.data.users).to.have.lengthOf(5);

          done(err);
        });
    });

    it('should throw an error if no users are returned', (done) => {
      exec('yarn migrate:undo && yarn migrate', () => {
        request
          .get('/api/users')
          .expect(400)
          .end((err, response) => {
            const body = response.body;

            expect(body.status).to.equal('fail');
            expect(body).to.have.all.keys('status', 'name', 'data');
            expect(body.data).to.have.all.keys('users');
            expect(body.name).to.equal('NoUsersFound');

            done(err);
          });
      });
    });
  });

  describe('GET /api/users/:uid', () => {
    it('should return the given user', (done) => {
      User.knex()
        .first()
        .then((user) => {
          request
            .get(`/api/users/${user.uid}`)
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('success');
              expect(body.data).to.have.all.keys('user');
              expect(body.data.user).to.be.an('object');
              expect(body.data.user).to.have.all.keys('uid', 'first_name', 'last_name', 'email', 'last_visit', 'created_at', 'updated_at', 'deleted_at');
              expect(body.data.user.deleted_at).to.be.null;

              done(err);
            });
        });
    });

    it('should throw an error if no user is found', (done) => {
      request
        .get('/api/users/xyz')
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('uid');
          expect(body.name).to.equal('UserNotFound');

          done(err);
        });
    });
  });

  describe('PUT /api/users/:uid', () => {
    it('should update the given user\'s details', (done) => {
      User.knex()
        .first()
        .then((user) => {
          request
            .put(`/api/users/${user.uid}`)
            .send({
              firstName: 'Joe',
              lastName: 'York',
            })
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('success');
              expect(body.data).to.have.all.keys('user');
              expect(body.data.user).to.be.an('object');
              expect(body.data.user).to.have.all.keys('uid', 'first_name', 'last_name', 'email', 'last_visit', 'created_at', 'updated_at', 'deleted_at');
              expect(body.data.user.first_name).to.equal('Joe');
              expect(body.data.user.last_name).to.equal('York');

              done(err);
            });
        });
    });

    it('should throw an error if no user is found', (done) => {
      request
        .get('/api/users/xyz')
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('uid');
          expect(body.name).to.equal('UserNotFound');

          done(err);
        });
    });
  });

  describe('DELETE /api/users/:uid', () => {
    it('should destroy the given user', (done) => {
      User.knex()
        .first()
        .then((user) => {
          request
            .delete(`/api/users/${user.uid}`)
            .expect(200)
            .end((err, response) => {
              const body = response.body;

              expect(body.status).to.equal('success');
              expect(body.data).to.be.null;

              done(err);
            });
        });
    });

    it('should throw an error if no user is found', (done) => {
      request
        .get('/api/users/xyz')
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('uid');
          expect(body.name).to.equal('UserNotFound');

          done(err);
        });
    });
  });
});
