const router = require('express').Router();
const controller = require('./auth-controller');

router.post('/signup', controller.signup);
router.post('/confirm-account', controller.confirmAccount);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/unlock-account', controller.unlockAccount);
router.post('/resend-confirmation', controller.resendConfirmation);
router.post('/resend-unlock-account', controller.resendUnlockAccount);

module.exports = router;
