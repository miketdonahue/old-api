exports.up = knex =>
  knex.schema.createTable('security_questions', (t) => {
    t.increments('id').unsigned().primary();
    t.string('short_name').notNull();
    t.string('question').notNull();
    t.timestamps(true, true);
  });

exports.down = knex =>
  knex.schema.dropTable('security_questions');
