exports.up = knex =>
  knex.schema.createTable('oauth_strategies', (t) => {
    t.increments('id').unsigned().primary();
    t.integer('user_id').unsigned().notNull();
    t.string('provider').notNull();
    t.string('access_token').notNull();
    t.string('refresh_token').nullable();
    t.string('expires').nullable();
    t.timestamps(true, true);

    t.foreign('user_id').references('Users.id').onDelete('CASCADE');
    t.index(['access_token']);
  });

exports.down = knex =>
  knex.schema.dropTable('oauth_strategies');
