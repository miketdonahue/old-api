module.exports = {
  "extends": "airbnb-base",
  "plugins": [
      "import"
  ],
  "rules": {
    "import/no-extraneous-dependencies": ["error", {"packageDir": "./package.json"}],
    "no-underscore-dangle": ["error",
      { "enforceInMethodNames": false, "allowAfterThis": true },
    ],
    "no-confusing-arrow": ["error", {"allowParens": true}],
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }],
    "no-param-reassign": ["error", { "props": false }]
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
