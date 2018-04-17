const shortId = require('shortid');
const bcrypt = require('bcrypt');
const md5 = require('md5');
const validator = require('local-validator');
const addHours = require('date-fns/add_hours');
const config = require('config');
const knex = require('knex')(config.database);

const User = {
  validations: {
    first_name: {
      format: {
        pattern: /[A-Za-z]+/,
        message: 'can contain only letters',
      },
    },
    last_name: {
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

  knex() {
    return knex('users');
  },

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

  async comparePassword(instance, password) {
    const user = await this.knex().where({ uid: instance.uid }).first().select('password');

    return bcrypt.compare(password, user.password).then(isMatch => ({ isMatch, user: instance }));
  },

  hashPassword(instance, password) {
    return bcrypt.hash(password, 10).then(hashedPassword => ({ hashedPassword, user: instance }));
  },

  validate(attributes) {
    return validator(attributes, this.validations);
  },

  _getRole(role) {
    return knex('roles').where('role', role).first().select('id');
  },
};

module.exports = User;
