module.exports = {
  "extends": "airbnb-base",
  "plugins": [
      "import"
  ],
  "rules": {
    "import/no-extraneous-dependencies": ["error", {"packageDir": "./package.json"}],
    "no-underscore-dangle": ["error", { "allow": ["_options", "_previousDataValues", "_headers"] }],
    "no-confusing-arrow": ["error", {"allowParens": true}],
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }]
  },
  "settings": {
    "import/resolver": {
      "node": {
        "moduleDirectory": [
          "node_modules",
          "src"
        ]
      }
    }
  },
  "env": {
    "es6": true,
    "node": true,
    "mocha": true
  }
};
