/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const User = require('../user');

describe('Unit Test: User Model', () => {
  describe('Valid', () => {
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

  describe('Invalid', () => {
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
