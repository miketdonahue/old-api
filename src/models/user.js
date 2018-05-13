const shortId = require('shortid');
const bcrypt = require('bcrypt');
const md5 = require('md5');
const validator = require('local-validator');
const addHours = require('date-fns/add_hours');
const config = require('config');
const knex = require('knex')(config.database);

const User = {
  name: 'user',
  validations: {
    firstName: {
      format: {
        pattern: /[A-Za-z]+/,
        message: 'can contain only letters',
      },
    },
    lastName: {
      format: {
        pattern: /[A-Za-z]+/,
        message: 'can contain only letters',
      },
    },
    email: { email: true },
    password: {
      length: {
        minimum: 6,
        maximum: 40,
        tooShort: 'must be greater than 6 characters',
        tooLong: 'must be less than 40 characters',
      },
    },
  },

  /**
   * Create ORM query connection to a given database model
   *
   * @param {String} model - Database table model to query; Default: 'users'
   * @return {Object} Query instance
   */
  knex() {
    return knex('users');
  },

  /**
   * Create a new user
   *
   * @param {Object} attributes - A set of user attributes to create the user with
   * @return {Object} The newly created user object
   */
  async create(attributes) {
    const uid = shortId.generate();
    const role = await this._getRole('user');
    const { hashedPassword } = await this.hashPassword(null, attributes.password);

    const payload = Object.assign({}, attributes, {
      uid,
      role_id: role.id,
      password: hashedPassword,
      confirmed: false,
      confirmed_token: md5(attributes.email + Math.random()),
      confirmed_expires: addHours(new Date(), config.auth.tokens.confirmed.expireTime),
    });

    return this
      .knex()
      .insert(payload)
      .then(() =>
        this.knex()
          .where({ uid })
          .first());
  },

  /**
   * Hash the password
   *
   * @param {Object} instance - A user model instance
   * @param {Object} attributes - A set of user attributes to be updated
   * @return {Object} A user instance with the updated values
   */
  update(instance, attributes) {
    return this
      .knex()
      .where({ uid: instance.uid })
      .update(attributes)
      .then(() =>
        this.knex()
          .where({ uid: instance.uid })
          .first())
      .then(updatedUser => Object.assign({}, instance, updatedUser));
  },

  /**
   * Compare passwords
   *
   * @param {Object} instance - A user model instance
   * @param {String} password - The user's password
   * @return {Object} A boolean for if there is a match and the original user instance
   */
  async comparePassword(instance, password) {
    const user = await this.knex().where({ uid: instance.uid }).first().select('password');

    return bcrypt.compare(password, user.password).then(isMatch => ({ isMatch, user: instance }));
  },

  /**
   * Hash a password
   *
   * @param {Object} instance - A user model instance
   * @param {String} password - The user's password
   * @return {Object} The hashed password and the original user instance
   */
  hashPassword(instance, password) {
    return bcrypt.hash(password, 10).then(hashedPassword => ({ hashedPassword, user: instance }));
  },

  /**
   * Validate user input
   *
   * @param {Object} attributes - User input from req.body
   * @return {Object} Failed validations
   */
  validate(attributes) {
    return validator(this.name, attributes, this.validations);
  },

  /**
   * Gets the Role ID for the given role
   *
   * @param {String} role - The name of a role
   * @return {String} A role ID.
   */
  _getRole(role) {
    return knex('roles').where('role', role).first().select('id');
  },
};

module.exports = User;
