'use strict';

const { verifyPassword } = require('../auth/passwords');
const { ROLES, createUser, displayInitials, getUser, getUserByUsername, listUsers, updateUser } = require('../auth/users');
const { paginateRows } = require('../pagination');

function queryString(value) {
  if (Array.isArray(value)) return queryString(value[0]);
  if (typeof value !== 'string') return '';
  return value;
}

function formValues(body, user) {
  const source = body && typeof body === 'object' ? body : {};
  const current = user || {};
  return {
    username: Object.prototype.hasOwnProperty.call(source, 'username')
      ? queryString(source.username)
      : current.username || '',
    displayName: Object.prototype.hasOwnProperty.call(source, 'display_name')
      ? queryString(source.display_name)
      : current.displayName || '',
    role: Object.prototype.hasOwnProperty.call(source, 'role') ? queryString(source.role) : current.role || 'reader',
    disabled: Object.prototype.hasOwnProperty.call(source, 'disabled')
      ? source.disabled === '1' || source.disabled === 'on' || source.disabled === true
      : Boolean(current.disabledAt),
  };
}

function renderForm(res, status, fields) {
  res.status(status).render('user-form', {
    mode: fields.mode,
    user: fields.user || null,
    values: fields.values,
    errors: fields.errors || [],
    roles: ROLES,
  });
}

function errorDetails(err) {
  if (err && Array.isArray(err.details) && err.details.length) return err.details;
  if (err && err.message) return [err.message];
  return ['The user could not be saved.'];
}

function mountUserRoutes(app, db) {
  app.get('/profile', (req, res, next) => {
    const user = getUser(db, req.principal.id);
    if (!user) {
      const err = new Error('User not found.');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    res.render('profile', { user, initials: displayInitials(user.displayName) });
  });

  app.get('/theme', (req, res) => {
    res.render('theme');
  });

  function requireAdministrator(req, res, next) {
    if (req.principal && req.principal.role === 'administrator') return next();
    const err = new Error('You do not have permission to manage users.');
    err.code = 'FORBIDDEN';
    return next(err);
  }

  app.get('/users', requireAdministrator, (req, res) => {
    const pagination = paginateRows(listUsers(db), req.query.page, (page) =>
      page > 1 ? `/users?page=${page}` : '/users'
    );
    pagination.label = 'User pages';
    res.render('users', { users: pagination.rows, pagination });
  });

  app.get('/users/new', requireAdministrator, (req, res) => {
    renderForm(res, 200, {
      mode: 'new',
      values: { username: '', displayName: '', role: 'reader', disabled: false },
    });
  });

  app.post('/users', requireAdministrator, (req, res, next) => {
    const values = formValues(req.body, null);
    try {
      createUser(db, {
        username: values.username,
        displayName: values.displayName,
        role: values.role,
        password: queryString(req.body.password),
      });
      res.redirect(303, '/users');
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        renderForm(res, 400, { mode: 'new', values, errors: errorDetails(err) });
        return;
      }
      next(err);
    }
  });

  app.get('/users/:id/edit', requireAdministrator, (req, res, next) => {
    const user = getUser(db, req.params.id);
    if (!user) {
      const err = new Error('User not found.');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    renderForm(res, 200, { mode: 'edit', user, values: formValues(null, user) });
  });

  app.post('/users/:id', requireAdministrator, (req, res, next) => {
    const user = getUser(db, req.params.id);
    if (!user) {
      const err = new Error('User not found.');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    const values = formValues(req.body, user);
    values.username = user.username;
    const nextPassword = queryString(req.body.password);
    const currentPassword = queryString(req.body.current_password);
    if (nextPassword) {
      const stored = getUserByUsername(db, user.username);
      const currentOk = Boolean(currentPassword) && stored && verifyPassword(currentPassword, stored.passwordHash);
      if (!currentOk) {
        renderForm(res, 400, {
          mode: 'edit',
          user,
          values,
          errors: [
            currentPassword
              ? 'Current password is not valid.'
              : 'Enter the current password to set a new one.',
          ],
        });
        return;
      }
    }
    try {
      updateUser(
        db,
        user.id,
        {
          displayName: values.displayName,
          role: values.role,
          disabled: values.disabled,
          password: queryString(req.body.password),
        },
        req.principal.id
      );
      res.redirect(303, '/users');
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        renderForm(res, 400, { mode: 'edit', user, values, errors: errorDetails(err) });
        return;
      }
      next(err);
    }
  });
}

module.exports = { mountUserRoutes };
