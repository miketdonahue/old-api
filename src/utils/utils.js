/**
 * Prepares the response data to be returned
 *
 * @description Takes an attribute whitelist, applies data to the whitelist keys
 * @function
 * @param {Object} attrWhitelist - Whitelist of attributes acceptable to be sent to client
 * @param {Object} data - The data to be assigned to each key from whitelist
 * @returns {Object} - Prepared data object to be returned to client
 */
const responseData = (attrWhitelist, data) => {
  const responseObj = {};

  attrWhitelist.forEach((key) => {
    responseObj[key] = data[key];
  });

  return responseObj;
};

module.exports = {
  responseData,
};
