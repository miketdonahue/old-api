/**
 * Seed "security_questions" database table
 *
 * @description Adds all possible security questions to database
 * @function
 * @param {Object} knex - knex connector
 */
exports.seed = knex =>
  knex('security_questions').del()
    .then(() =>
      knex('security_questions').insert([
        {
          short_name: 'street_name',
          question: 'What was the house number and street name you lived in as a child?',
        },
        {
          short_name: 'drivers_license',
          question: 'What are the last five digits of your driver\'s licence number?',
        },
        {
          short_name: 'parents_met',
          question: 'In what town or city did your mother and father meet?',
        },
        {
          short_name: 'telephone_number',
          question: 'What were the last four digits of your childhood telephone number?',
        },
        {
          short_name: 'time_born',
          question: 'What time of the day were you born? (hh:mm)',
        },
        {
          short_name: 'first_job_city',
          question: 'In what town or city was your first full time job?',
        },
        {
          short_name: 'grandma_mother_maiden',
          question: 'What is your grandmother\'s (on your mother\'s side) maiden name?',
        },
        {
          short_name: 'first_pet_name',
          question: 'What was the name of your first pet?',
        },
        {
          short_name: 'first_kiss_location',
          question: 'Where were you when you had your first kiss?',
        },
        {
          short_name: 'spouse_mother_maiden',
          question: 'What is your spouse or partner\'s mother\'s maiden name?',
        },
      ]),
    )
    .catch((error) => {
      console.log('SEED: Security Questions', error); // eslint-disable-line no-console
    });
