exports.up = knex =>
  knex.schema.createTable('users', (t) => {
    t.increments('id').unsigned().primary();
    t.string('uid').notNull().unique();
    t.integer('role_id').unsigned().notNull();
    t.string('first_name').notNull();
    t.string('last_name').notNull();
    t.string('email').notNull();
    t.string('password').notNull();
    t.dateTime('last_visit').nullable();
    t.string('ip').nullable();
    t.boolean('confirmed').notNull();
    t.string('confirmed_token').nullable();
    t.dateTime('confirmed_expires').nullable();
    t.string('reset_password_token').nullable();
    t.dateTime('reset_password_expires').nullable();
    t.timestamps(true, true);
    t.dateTime('deleted_at').nullable();

    t.foreign('role_id').references('Roles.id').onDelete('CASCADE');
    t.index(['uid', 'email', 'confirmed_token', 'reset_password_token']);
  });

exports.down = knex =>
  knex.schema.dropTable('users');
