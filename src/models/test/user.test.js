/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const User = require('../user');

describe('Unit Test: User Model', () => {
  describe('Valid', () => {
    it('should return undefined for a user passing validations', () => {
      try {
        User.validate({
          first_name: 'Michael',
          last_name: 'Jones',
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
          first_name: 'Mike123',
        });
      } catch (validationErr) {
        expect(validationErr.data).to.have.all.keys('first_name');
        expect(validationErr.data.first_name).to.be.an('array');
        expect(validationErr.data.first_name).to.have.lengthOf(1);
      }
    });

    it('should only allow letters in the last name', () => {
      try {
        User.validate({
          last_name: 'Jones&^*',
        });
      } catch (validationErr) {
        expect(validationErr.data).to.have.all.keys('last_name');
        expect(validationErr.data.last_name).to.be.an('array');
        expect(validationErr.data.last_name).to.have.lengthOf(1);
      }
    });

    it('should only allow a valid email address', () => {
      try {
        User.validate({
          email: 'mikeatmail.com',
        });
      } catch (validationErr) {
        expect(validationErr.data).to.have.all.keys('email');
        expect(validationErr.data.email).to.be.an('array');
        expect(validationErr.data.email).to.have.lengthOf(1);
      }
    });

    it('should only allow password to be more than 6 characters', () => {
      try {
        User.validate({
          password: 'pass',
        });
      } catch (validationErr) {
        expect(validationErr.data).to.have.all.keys('password');
        expect(validationErr.data.password).to.be.an('array');
        expect(validationErr.data.password).to.have.lengthOf(1);
      }
    });

    it('should only allow password to be less than 40 characters', () => {
      try {
        User.validate({
          password: 'reallyreallyreallyreallylongpassowrd',
        });
      } catch (validationErr) {
        expect(validationErr.data).to.have.all.keys('password');
        expect(validationErr.data.password).to.be.an('array');
        expect(validationErr.data.password).to.have.lengthOf(1);
      }
    });
  });
});
