module.exports = {
  up(queryInterface, Sequelize) {
    queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'user',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    queryInterface.addIndex('roles', ['name'], {
      indexName: 'RolesIndex',
      indicesType: 'UNIQUE',
    });
  },

  down(queryInterface) {
    return queryInterface.dropTable('roles');
  },
};
