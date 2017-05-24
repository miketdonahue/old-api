const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const shortId = require('shortid');
const logger = require('md-logger');
const md5 = require('md5');
const momentDate = require('moment');
const config = require('config');
const xss = require('xss');
const difference = require('lodash.difference');
const v = require('md-validations');

const dbUrl = `mysql://${config.database.username}:${config.database.password}@localhost:3306/${config.database.database}`;
const sequelize = new Sequelize(dbUrl);
const User = sequelize.define('Users', {
  short_id: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    required: (value) => {
      v.required(value);
    },
    suspicious: (value) => {
      v.suspicious(value);
    },
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      required: (value) => {
        v.required(value);
      },
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      required: (value) => {
        v.required(value);
      },
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
    unique: true,
    set(val) {
      this.setDataValue('email', val.toLowerCase());
    },
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      required: (value) => {
        v.required(value);
      },
    },
  },
  last_visit: {
    type: Sequelize.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  ip: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      isIP: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  confirmed: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    validate: {
      isIn: [[true, false]],
      required: (value) => {
        v.required(value);
      },
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  confirmed_token: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      len: 32,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  confirmed_expires: {
    type: Sequelize.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  reset_password_token: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      len: 32,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  reset_password_expires: {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: null,
    validate: {
      isDate: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
}, {
  freezeTableName: true,
  underscored: true,
  deletedAt: 'deleted_at',
  paranoid: true,
  instanceMethods: {
    hashPassword(password) {
      return bcrypt.hash(password, 10).then(hash => hash);
    },
    comparePassword(userPassword) {
      return bcrypt.compare(userPassword, this.password).then(isMatch => isMatch);
    },
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['short_id', 'email', 'confirmed_token', 'reset_password_token'],
    },
  ],
});

// Hooks
User.beforeValidate((obj, options, cb) => {
  const user = obj;

  user.short_id = shortId.generate();
  return cb(null, options);
});

User.afterValidate('sanitize', (obj, options, cb) => {
  const user = obj;
  const skipFields = ['id', 'created_at', 'updated_at', 'deleted_at'];
  const fields = difference(options.fields, skipFields);

  fields.forEach((field) => {
    user[field] = xss(user[field]);
  });

  return cb(null, options);
});

User.beforeCreate((obj, options, cb) => {
  const user = obj;

  return bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      logger.error({
        id: user.short_id,
      }, 'MODEL.beforeCreate: Password hash failure');
    }

    user.password = hash;
    user.confirmed_token = md5(user.email + Math.random());
    user.confirmed_expires = momentDate().utc().add(2, 'h');

    return cb(null, options);
  });
});

module.exports = User;
