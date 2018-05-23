const { readFileSync } = require('fs');
const { join } = require('path');

const userTypes = readFileSync(join(__dirname, 'user-types.graphql'), 'utf8');
const userQueries = readFileSync(join(__dirname, 'user-queries.graphql'), 'utf8');
const userMutations = readFileSync(join(__dirname, 'user-mutations.graphql'), 'utf8');
const userResolvers = require('./user-resolvers');

module.exports = {
  userTypes: `${userTypes} ${userQueries} ${userMutations}`,
  userResolvers,
};
