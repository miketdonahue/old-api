const router = require('express').Router();
const controller = require('./swagger-controller');

router.get('/', controller.swagger);

module.exports = router;
