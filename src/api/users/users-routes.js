const router = require('express').Router();
const controller = require('./users-controller');
const hasAccess = require('middleware/verify-access');

router.get('/', hasAccess('list', 'users'), controller.list);
router.route('/:uid')
  .get(hasAccess('show', 'users'), controller.show)
  .put(hasAccess('update', 'users'), controller.update)
  .delete(hasAccess('destroy', 'users'), controller.destroy);

module.exports = router;
