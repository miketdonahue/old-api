const logger = require('local-logger');
const formatError = require('local-error-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);

/**
 * Charge a customer
 *
 * @description Saves customer ID and charges them via Stripe
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const charge = (req, res) =>
  stripe.charges.create({
    amount: req.body.amount,
    currency: 'usd',
    description: 'Sample Charge',
    source: req.body.stripeToken,
    receipt_email: req.body.stripeEmail,
  })
    .then(chargedCustomer => res.json({ status: 'success', data: { payment: chargedCustomer } }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, response: err }, `PAYMENTS-CTRL.CHARGE: ${err.message}`);
      return res.status(err.statusCode).json({ errors: err.jsonResponse });
    });

module.exports = {
  charge,
};
