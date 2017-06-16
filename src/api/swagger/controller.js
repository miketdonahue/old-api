const path = require('path');

/**
 * Example documentation.
 * @function
 */
const swagger = (req, res) => res.sendFile(path.join(__dirname, '../../..', '/public/swagger/index.html'));

module.exports = {
  swagger,
};
