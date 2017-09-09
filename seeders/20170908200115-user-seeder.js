const User = require('../src/models/user');
const momentDate = require('moment');
const Chance = require('chance');

const numberOfUsers = 10;

module.exports = {
  up: function () {
    const chance = new Chance();
    const promises = [];

    for (var i = 0; i < numberOfUsers; i++) {
      const promise = User.create({
        first_name: chance.first(),
        last_name: chance.last(),
        email: chance.email(),
        password: 'password',
        last_visit: momentDate(),
        ip: chance.ip()
      }, {
        fields: ['uid', 'first_name', 'last_name', 'email', 'password', 'last_visit', 'ip', 'confirmed_token', 'confirmed_expires'],
      });

      promises.push(promise);
    }

    return Promise.all(promises);
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('users', null);
  }
};
