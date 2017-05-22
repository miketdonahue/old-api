const router = require('express').Router();
const controller = require('./controller');

router.post('/signin', controller.signIn);

module.exports = router;
