exports.up = knex =>
  knex.schema.createTable('users_security_questions', (t) => {
    t.increments('id').unsigned().primary();
    t.integer('user_id').unsigned().notNull();
    t.integer('question_id').unsigned().notNull();
    t.string('answer').notNull();
    t.timestamps(true, true);

    t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.foreign('question_id').references('id').inTable('security_questions').onDelete('CASCADE');
  });

exports.down = knex =>
  knex.schema.dropTable('users_security_questions');
