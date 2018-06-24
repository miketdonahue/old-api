const md5 = require('md5');
const shortId = require('shortid');
const addMinutes = require('date-fns/add_minutes');
const argon2 = require('argon2');
const Chance = require('chance');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Seed "users" database table
 *
 * @description Adds user, admin roles to database
 * @function
 * @param {Object} knex - knex connector
 * @param {Promise} Promise - ES6 native Promise
 */
const seeder = isDevelopment ? (knex, Promise) => {
  const numberOfUsers = 5;

  const chance = new Chance();
  const rows = [];

  return knex.raw('SET foreign_key_checks = 0;')
    .then(() => knex('users').truncate())
    .then(() => argon2.hash('Password123', { timeCost: 2000, memoryCost: 500 }))
    .then((password) => {
      for (let i = 0; i < numberOfUsers; i++) {
        const user = {
          uid: shortId.generate(),
          role_id: 1,
          first_name: chance.first(),
          last_name: chance.last(),
          email: chance.email(),
          password,
          street_address: chance.street({ country: 'us', short_suffix: true }),
          apt_suite: chance.floating({ min: 1000, max: 2000, fixed: 0 }),
          city: chance.city(),
          state: chance.state({ country: 'us' }),
          zip_code: chance.zip(),
          company: chance.company(),
          title: chance.profession(),
          blurb: chance.paragraph({ sentences: 3 }),
          confirmed: false,
          confirmed_token: md5(`token${Math.random()}`),
          confirmed_expires: addMinutes(new Date(), 360),
        };

        rows.push(
          knex('users').insert(user),
        );
      }

      return Promise.all(rows);
    })
    .then(() => knex.raw('SET foreign_key_checks = 1;'))
    .catch((error) => {
      console.log('SEED: Users', error); // eslint-disable-line no-console
    });
} : () => {};

exports.seed = seeder;
