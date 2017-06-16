const router = require('express').Router();
const controller = require('./controller');

router.get('/', controller.swagger);

module.exports = router;
