const bcrypt = require('bcrypt');
const shortId = require('shortid');
const logger = require('local-logger');
const md5 = require('md5');
const momentDate = require('moment');
const xss = require('xss');
const difference = require('lodash.difference');
const v = require('local-validations');
const { sequelize, DataTypes } = require('./index.js');

const User = sequelize.define('user', {
  short_id: {
    type: DataTypes.STRING,
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
    type: DataTypes.STRING,
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
    type: DataTypes.STRING,
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
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      required: (value) => {
        v.required(value);
      },
    },
  },
  last_visit: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIP: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
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
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: 32,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  confirmed_expires: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    validate: {
      isDate: true,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  reset_password_token: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: 32,
      suspicious: (value) => {
        v.suspicious(value);
      },
    },
  },
  reset_password_expires: {
    type: DataTypes.DATE,
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
  underscored: true,
  deletedAt: 'deleted_at',
  paranoid: true,
}, {
  indexes: [
    {
      unique: true,
      fields: ['short_id', 'email', 'confirmed_token', 'reset_password_token'],
    },
  ],
});

// Methods
User.prototype.hashPassword = password => bcrypt.hash(password, 10).then(hash => hash);

User.prototype.comparePassword = userPassword => (
  bcrypt.compare(userPassword, this.password).then(isMatch => isMatch)
);

// Hooks
User.beforeValidate((obj, options) => {
  const user = obj;

  user.short_id = shortId.generate();
  return sequelize.Promise.resolve(options);
});

User.afterValidate('sanitize', (obj, options) => {
  const user = obj;
  const skipFields = ['id', 'created_at', 'updated_at', 'deleted_at'];
  const fields = difference(options.fields, skipFields);

  fields.forEach((field) => {
    user[field] = xss(user[field]);
  });

  return sequelize.Promise.resolve(options);
});

User.beforeCreate((obj, options) => {
  const user = obj;

  // Update their documentation with a PR for this
  // It is only for async calls. Promises instead of callbacks
  return new Promise((resolve, reject) => {
    bcrypt.hash(user.password, 10, (err, hash) => {
      if (err) {
        logger.error({
          id: user.short_id,
        }, 'MODEL.beforeCreate: Password hash failure');

        return reject(err);
      }

      user.password = hash;
      user.confirmed_token = md5(user.email + Math.random());
      user.confirmed_expires = momentDate().utc().add(2, 'h');

      return resolve(options);
    });
  });
});

module.exports = User;
