const Chance = require('chance');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Seed "users_security_questions" database table
 *
 * @description Adds some security questions and answers for users
 * @function
 * @param {Object} knex - knex connector
 * @param {Promise} Promise - ES6 native Promise
 */
const seeder = isDevelopment ? (knex, Promise) => {
  const numberOfUsers = 5;

  const chance = new Chance();
  const rows = [];

  return knex.raw('SET foreign_key_checks = 0;')
    .then(() => knex('users_security_questions').truncate())
    .then(() => {
      for (let i = 0; i < numberOfUsers; i++) {
        const row = {
          user_id: chance.integer({ min: 1, max: 5 }),
          question_id: chance.integer({ min: 1, max: 10 }),
          answer: 'secret',
        };

        rows.push(
          knex('users_security_questions').insert(row),
        );
      }

      return Promise.all(rows);
    })
    .then(() => knex.raw('SET foreign_key_checks = 1;'))
    .catch((error) => {
      console.log('SEED: Users Security Questions', error); // eslint-disable-line no-console
    });
} : () => {};

exports.seed = seeder;
