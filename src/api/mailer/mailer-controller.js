const logger = require('local-logger');
const config = require('config');
const formatError = require('local-error-handler');
const emailClient = require('local-mailer');

/**
 * Adds new email to a recipient mailing list
 *
 * @description First, retrieve the list, append to recipient array, and update
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const updateList = (req, res) => {
  logger.info({ listId: req.params.listId }, 'MAILER-CTRL.UPDATE-LIST: Retrieving mailing list');

  return emailClient.getList(req.params.listId)
    .then((list) => {
      const listId = list.results.id;
      const recipientList = list.results.recipients;

      // Add new email to the mailing list
      recipientList.push({
        address: {
          email: req.body.email,
        },
        return_path: `no-reply@${config.mailer.domain}`,
      });

      logger.info({ listId: list.results.id }, 'MAILER-CTRL.UPDATE-LIST: Updating mailing list');

      return emailClient.updateList(listId, recipientList);
    })
    .then(() => res.json({ data: null }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `MAILER-CTRL.UPDATE-LIST: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });
};

module.exports = {
  updateList,
};
