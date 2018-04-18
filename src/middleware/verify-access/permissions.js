module.exports = [
  { role: 'admin', resource: 'users', action: 'create:any', attributes: ['*'] },
  { role: 'admin', resource: 'users', action: 'read:any', attributes: ['*'] },
  { role: 'admin', resource: 'users', action: 'update:any', attributes: ['*'] },
  { role: 'admin', resource: 'users', action: 'delete:any', attributes: ['*'] },

  { role: 'user', resource: 'users', action: 'read:own', attributes: ['*'] },
  { role: 'user', resource: 'users', action: 'update:own', attributes: ['*'] },
  { role: 'user', resource: 'users', action: 'delete:own', attributes: ['*'] },
];
