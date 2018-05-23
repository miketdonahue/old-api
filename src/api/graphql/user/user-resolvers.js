const books = [
  {
    title: 'My 1st book',
    author: 'Hue',
  },
  {
    title: 'My 2st book',
    author: 'Don',
  },
];

const resolvers = {
  Query: { books: () => books },
  Mutation: { createBook(obj, args) { return books.push({ title: args.title, author: args.author }); } },
};

module.exports = resolvers;
