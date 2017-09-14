const Role = require('../src/models').role;

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
      });

      promises.push(promise);
    }

    return Promise.all(promises);
  },

  down(queryInterface) {
    return queryInterface.bulkDelete('roles', null);
  },
};
