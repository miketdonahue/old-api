const jwt = require('jsonwebtoken');
const config = require('../../config/default');

function verifyJwt() {
  return (req, res, next) => {
    jwt.verify(token, config.secrets.jwt, (err, code) => {
      var token = getTokenFromHeader(req.headers);


    });
  };
}

function getTokenFromHeader(headers) {
  var parts = headers.authorization.split(' ');
  var token;

  if (parts.length === 2) {
    var scheme = parts[0];
    var credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      token = credentials;
      return next();
    } else {
      return next({code: 'UNAUTHORIZED', message: '401'});
    }
  }
}

module.exports = {
  verifyJwt,
};
