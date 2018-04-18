const router = require('express').Router();
const controller = require('./mailer-controller');

router.put('/list/:listId/update', controller.updateList);

module.exports = router;
