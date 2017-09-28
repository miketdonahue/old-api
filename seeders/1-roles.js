const Role = require('../src/models').role;
const logger = require('../src/node_modules/local-logger');

module.exports = {
  up() {
    const rolesToCreate = ['admin', 'user'];
    const promises = [];

    for (let i = 0; i <= rolesToCreate.length; i++) {
      const role = rolesToCreate.pop();
      const promise = Role.create({
        name: role,
      }, {
        fields: ['name'],
      })
        .catch((error) => {
          logger.error(error);
        });

      promises.push(promise);
    }

    return Promise.all(promises);
  },

  down(queryInterface) {
    return queryInterface.bulkDelete('roles', null);
  },
};
