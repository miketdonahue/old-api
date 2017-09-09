const router = require('express').Router();
const controller = require('./mailer-controller');

router.post('/confirm', controller.confirmMail);

module.exports = router;
