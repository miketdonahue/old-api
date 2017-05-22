const signToken = require('../../clients/auth/auth-client').signToken;

const signIn = (req, res) => {
  const token = signToken(req.user.id);
  return res.json({ token });
};

module.exports = {
  signIn,
};
