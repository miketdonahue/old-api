exports.up = knex =>
  knex.schema.createTable('roles', (t) => {
    t.increments('id').unsigned().primary();
    t.string('role').notNull();
    t.timestamps(true, true);
    t.dateTime('deleted_at').nullable();

    t.index(['role']);
  });

exports.down = knex =>
  knex.schema.dropTable('roles');
