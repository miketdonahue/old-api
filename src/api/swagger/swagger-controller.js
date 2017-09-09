const path = require('path');

const swagger = (req, res) => res.sendFile(path.join(__dirname, '../../..', '/public/swagger/index.html'));

module.exports = {
  swagger,
};
