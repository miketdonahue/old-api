const config = require('config');
const logger = require('local-logger');
const { makeExecutableSchema } = require('graphql-tools');

const { userTypes, userResolvers } = require('./user/user-schema');

const baseSchema = `
  schema {
    query: Query
    mutation: Mutation
  }
`;

const typeDefs = [baseSchema, userTypes];
const resolvers = [userResolvers];

const graphqlSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
  logger: { log: e => logger.error(e, `GRAPHQL: ${e.message}`) },
  allowUndefinedInResolve: !config.graphql.debug,
  resolverValidationOptions: {
    requireResolversForAllFields: config.graphql.debug,
  },
});

module.exports = {
  graphqlSchema,
};
