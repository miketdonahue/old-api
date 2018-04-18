exports.seed = knex =>
  knex('roles').del()
    .then(() =>
      knex('roles').insert([
        { role: 'user' },
        { role: 'admin' },
      ]),
    )
    .catch((error) => {
      console.log('SEED: Roles', error); // eslint-disable-line no-console
    });
