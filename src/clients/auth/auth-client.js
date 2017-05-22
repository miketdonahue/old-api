const jwt = require('jsonwebtoken');
const config = require('../../../config/default');
const expressJwt = require('express-jwt');

function decodeToken() {
  return (req, res, next) => {
    const checkToken = expressJwt({ secret: config.secrets.jwt });
    // this will call next if token is valid
    // and send error if its not. It will attached
    // the decoded token to req.user
    checkToken(req, res, next);
  };
}

function signToken(id) {
  return jwt.sign(
    { id },
    config.secrets.jwt,
    { expiresIn: config.expireTime });
}

module.exports = {
  decodeToken,
  signToken,
};
