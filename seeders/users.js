const md5 = require('md5');
const shortId = require('shortid');
const addHours = require('date-fns/add_hours');
const bcrypt = require('bcrypt');
const Chance = require('chance');

exports.seed = (knex, Promise) => {
  const numberOfUsers = 5;

  const chance = new Chance();
  const users = [];

  return knex.raw('SET foreign_key_checks = 0;')
    .then(() => knex('users').truncate())
    .then(() => {
      for (let i = 0; i < numberOfUsers; i++) {
        const user = {
          uid: shortId.generate(),
          role_id: 1,
          first_name: chance.first(),
          last_name: chance.last(),
          email: chance.email(),
          password: bcrypt.hashSync('password', 10),
          confirmed: false,
          confirmed_token: md5(`token${Math.random()}`),
          confirmed_expires: addHours(new Date(), 2),
        };

        users.push(
          knex('users').insert(user),
        );
      }

      return Promise.all(users);
    })
    .then(() => knex.raw('SET foreign_key_checks = 1;'))
    .catch((error) => {
      console.log('SEED: Users', error); // eslint-disable-line no-console
    });
};
