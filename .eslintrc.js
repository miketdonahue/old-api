module.exports = {
  "extends": "airbnb-base",
  "plugins": [
      "import"
  ],
  "rules": {
    "import/no-extraneous-dependencies": ["error", {"packageDir": "./package.json"}]
  },
  "env": {
    "es6": true,
    "node": true,
    "mocha": true
  }
};
