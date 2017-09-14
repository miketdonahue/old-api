module.exports = {
  up(queryInterface, Sequelize) {
    queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      uid: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      role_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'roles',
          key: 'id',
        },
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      last_visit: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      ip: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      confirmed: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      },
      confirmed_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      confirmed_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reset_password_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reset_password_expires: {
        type: Sequelize.DATE,
        allowNull: true,
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

    queryInterface.addIndex('users', ['last_name', 'email', 'confirmed_token', 'reset_password_token'], {
      indexName: 'UsersIndex',
      indicesType: 'UNIQUE',
    });
  },

  down(queryInterface) {
    return queryInterface.dropTable('users');
  },
};

