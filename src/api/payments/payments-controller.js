const logger = require('local-logger');
const formatError = require('local-error-formatter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
// const emailClient = require('./auth-emails');
// const User = require('../../models').user;

/**
 * Charge a customer
 *
 * @description Saves customer ID and charges them via Stripe
 * @function
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @returns {Object} - JSON response {status, data}
 */
const charge = (req, res) => {
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken,
  })
    .then(createdCustomer =>
      stripe.charges.create({
        amount: 1100,
        description: 'Sample Charge',
        currency: 'usd',
        customer: createdCustomer.id,
      }))
    .then(chargedCustomer => res.json({ status: 'success', data: { payment: chargedCustomer } }))
    .catch((error) => {
      const err = formatError(error);

      logger[err.level]({ err: error, info: err.info }, `PAYMENTS-CTRL.CHARGE: ${err.message}`);
      return res.status(err.statusCode).json(err.jsonResponse);
    });
};

module.exports = {
  charge,
};
