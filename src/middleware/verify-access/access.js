const AccessControl = require('accesscontrol');
const rolePermissions = require('./permissions');

const access = new AccessControl(rolePermissions);

/**
 * List action permissions
 *
 * @description If the route action is 'list' ensure user has 'readAny' access
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @returns {Object} - Permissions from AccessControl module
 */
function listAction(user, resource) {
  return access.can(user.role).readAny(resource);
}

/**
 * Create action permissions
 *
 * @description If the route action is 'create' ensure user has 'createOwn' or 'createAny' access
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @param {String} paramsUid - UID from the route params
 * @returns {Object} - Permissions from AccessControl module
 */
function createAction(user, resource, paramsUid) {
  const currentUser = user.uid === paramsUid;

  return currentUser ?
    access.can(user.role).createOwn(resource) :
    access.can(user.role).createAny(resource);
}

/**
 * Show action permissions
 *
 * @description If the route action is 'show' ensure user has 'readOwn' or 'readAny' access
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @param {String} paramsUid - UID from the route params
 * @returns {Object} - Permissions from AccessControl module
 */
function showAction(user, resource, paramsUid) {
  const currentUser = user.uid === paramsUid;

  return currentUser ?
    access.can(user.role).readOwn(resource) :
    access.can(user.role).readAny(resource);
}

/**
 * Update action permissions
 *
 * @description If the route action is 'update' ensure user has 'updateOwn' or 'updateAny' access
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @param {String} paramsUid - UID from the route params
 * @returns {Object} - Permissions from AccessControl module
 */
function updateAction(user, resource, paramsUid) {
  const currentUser = user.uid === paramsUid;

  return currentUser ?
    access.can(user.role).updateOwn(resource) :
    access.can(user.role).updateAny(resource);
}

/**
 * Destroy action permissions
 *
 * @description If the route action is 'destroy' ensure user has 'deleteOwn' or 'deleteAny' access
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @param {String} paramsUid - UID from the route params
 * @returns {Object} - Permissions from AccessControl module
 */
function destroyAction(user, resource, paramsUid) {
  const currentUser = user.uid === paramsUid;

  return currentUser ?
    access.can(user.role).deleteOwn(resource) :
    access.can(user.role).deleteAny(resource);
}

/**
 * Returns the correct permissions based on the route action
 *
 * @description Given a route and resource, returns permissions
 * @function
 * @param {Object} user - User information from JWT
 * @param {String} resource - Name of the route resource
 * @param {String} action - Name of the route action
 * @param {String} paramsUid - UID from the route params
 * @returns {Object} - Permissions from AccessControl module
 */
function getPermissions(user, resource, action, paramsUid) {
  let permissions;

  switch (action) {
    case 'list':
      permissions = listAction(user, resource);
      break;
    case 'create':
      permissions = createAction(user, resource, paramsUid);
      break;
    case 'show':
      permissions = showAction(user, resource, paramsUid);
      break;
    case 'update':
      permissions = updateAction(user, resource, paramsUid);
      break;
    case 'destroy':
      permissions = destroyAction(user, resource, paramsUid);
      break;
    default:
      break;
  }

  return permissions;
}

module.exports = getPermissions;
