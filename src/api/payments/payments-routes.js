const router = require('express').Router();
const controller = require('./payments-controller');

router.post('/charge', controller.charge);

module.exports = router;
