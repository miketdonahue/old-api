module.exports = {
  "extends": "airbnb-base",
  "plugins": [
      "import"
  ],
  "rules": {
    "import/no-extraneous-dependencies": ["error", {"packageDir": "./package.json"}],
    "no-underscore-dangle": ["error", { "allow": ["_options", "_previousDataValues"] }]
  },
  "env": {
    "es6": true,
    "node": true,
    "mocha": true
  }
};
