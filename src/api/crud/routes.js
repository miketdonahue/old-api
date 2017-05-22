const router = require('express').Router();
const todoList = require('./controller');

router.get('/', todoList.tasks);

module.exports = router;
