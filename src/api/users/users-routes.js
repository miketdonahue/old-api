const router = require('express').Router();
const controller = require('./users-controller');

router.get('/', controller.list);
router.route('/:uid')
  .get(controller.show)
  .put(controller.update)
  .delete(controller.destroy);

module.exports = router;
