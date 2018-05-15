/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const { exec } = require('child_process');
const UserModel = require('../user');

describe('Unit Test: User Model', () => {
  const User = new UserModel();

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

  describe('Methods', () => {
    it('knex: should query table equal to agurment value', () => {
      try {
        const calledTable = User.knex('model');

        expect(calledTable._single.table).to.equal('model'); // eslint-disable-line
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });

    it('create: should create a new user', () => {
      try {
        User.create({
          email: 'mike@xxxxx.com',
          first_name: 'Mike',
          last_name: 'James',
          password: 'password',
        });
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });

    it('update: should update a user', () => {
      try {
        User.create({
          email: 'mike@xxxxx.com',
          first_name: 'Mike',
          last_name: 'James',
          password: 'password',
        })
          .then((user) => {
            User.update(user, { email: 'mike@yyyyy.com' });
          });
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });

    it('comparePassword: should return true if password is the same', () => {
      try {
        User.create({
          email: 'mike@xxxxx.com',
          first_name: 'Mike',
          last_name: 'James',
          password: 'password',
        })
          .then((user) => {
            User.comparePassword(user, 'password')
              .then(({ isMatch }) => {
                expect(isMatch).to.be.true;
              });
          });
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });

    it('hashPassword: should return a hashed password as a string', () => {
      try {
        User.create({
          email: 'mike@xxxxx.com',
          first_name: 'Mike',
          last_name: 'James',
          password: 'password',
        })
          .then((user) => {
            User.hashPassword(user, 'password')
              .then(({ hashedPassword }) => {
                expect(hashedPassword).to.be.a('string');
              });
          });
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });

    it('_getRole: should return an ID as an integer of the given role name', () => {
      try {
        // eslint-disable-next-line
        User._getRole('user').then((role) => {
          expect(role.id).to.be.a('number');
        });
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });

  describe('Validations: Passing', () => {
    it('should return undefined for a user passing validations', () => {
      try {
        User.validate({
          firstName: 'Michael',
          lastName: 'Jones',
          email: 'mike@mail.com',
          password: 'password',
        });
      } catch (validationErr) {
        expect(validationErr).to.be.undefined;
      }
    });
  });

  describe('Validations: Failing', () => {
    it('should only allow letters in the first name', () => {
      try {
        User.validate({
          firstName: 'Mike123',
        });
      } catch (validationErr) {
        expect(validationErr.name).to.equal('ValidationError');
        expect(validationErr.message).to.equal('User input has failed validations');
        expect(validationErr.statusCode).to.equal('400');
        expect(validationErr.errors).to.be.an('array');
        expect(validationErr.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(validationErr.errors[0].statusCode).to.equal('400');
        expect(validationErr.errors[0].message).to.be.a('string');
        expect(validationErr.errors[0].code).to.equal('VALIDATION_FAILED');
        expect(validationErr.errors[0].source).to.be.an('object');
        expect(validationErr.errors[0].source).to.have.all.keys('path');
        expect(validationErr.errors[0].source.path).to.equal('data/user/firstName');
      }
    });

    it('should only allow letters in the last name', () => {
      try {
        User.validate({
          lastName: 'Jones&^*',
        });
      } catch (validationErr) {
        expect(validationErr.name).to.equal('ValidationError');
        expect(validationErr.message).to.equal('User input has failed validations');
        expect(validationErr.statusCode).to.equal('400');
        expect(validationErr.errors).to.be.an('array');
        expect(validationErr.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(validationErr.errors[0].statusCode).to.equal('400');
        expect(validationErr.errors[0].message).to.be.a('string');
        expect(validationErr.errors[0].code).to.equal('VALIDATION_FAILED');
        expect(validationErr.errors[0].source).to.be.an('object');
        expect(validationErr.errors[0].source).to.have.all.keys('path');
        expect(validationErr.errors[0].source.path).to.equal('data/user/lastName');
      }
    });

    it('should only allow a valid email address', () => {
      try {
        User.validate({
          email: 'mikeatmail.com',
        });
      } catch (validationErr) {
        expect(validationErr.name).to.equal('ValidationError');
        expect(validationErr.message).to.equal('User input has failed validations');
        expect(validationErr.statusCode).to.equal('400');
        expect(validationErr.errors).to.be.an('array');
        expect(validationErr.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(validationErr.errors[0].statusCode).to.equal('400');
        expect(validationErr.errors[0].message).to.be.a('string');
        expect(validationErr.errors[0].code).to.equal('VALIDATION_FAILED');
        expect(validationErr.errors[0].source).to.be.an('object');
        expect(validationErr.errors[0].source).to.have.all.keys('path');
        expect(validationErr.errors[0].source.path).to.equal('data/user/email');
      }
    });

    it('should only allow password to be more than 6 characters', () => {
      try {
        User.validate({
          password: 'pass',
        });
      } catch (validationErr) {
        expect(validationErr.name).to.equal('ValidationError');
        expect(validationErr.message).to.equal('User input has failed validations');
        expect(validationErr.statusCode).to.equal('400');
        expect(validationErr.errors).to.be.an('array');
        expect(validationErr.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(validationErr.errors[0].statusCode).to.equal('400');
        expect(validationErr.errors[0].message).to.be.a('string');
        expect(validationErr.errors[0].code).to.equal('VALIDATION_FAILED');
        expect(validationErr.errors[0].source).to.be.an('object');
        expect(validationErr.errors[0].source).to.have.all.keys('path');
        expect(validationErr.errors[0].source.path).to.equal('data/user/password');
      }
    });

    it('should only allow password to be less than 40 characters', () => {
      try {
        User.validate({
          password: 'reallyreallyreallyreallyreallyreallylongpassowrd',
        });
      } catch (validationErr) {
        expect(validationErr.name).to.equal('ValidationError');
        expect(validationErr.message).to.equal('User input has failed validations');
        expect(validationErr.statusCode).to.equal('400');
        expect(validationErr.errors).to.be.an('array');
        expect(validationErr.errors[0]).to.have.all.keys('statusCode', 'message', 'code', 'source');
        expect(validationErr.errors[0].statusCode).to.equal('400');
        expect(validationErr.errors[0].message).to.be.a('string');
        expect(validationErr.errors[0].code).to.equal('VALIDATION_FAILED');
        expect(validationErr.errors[0].source).to.be.an('object');
        expect(validationErr.errors[0].source).to.have.all.keys('path');
        expect(validationErr.errors[0].source.path).to.equal('data/user/password');
      }
    });
  });
});
