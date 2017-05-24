const router = require('express').Router();
const controller = require('./controller');

router.post('/signup', controller.signup);
router.get('/confirm-account', controller.confirmAccount);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

module.exports = router;
