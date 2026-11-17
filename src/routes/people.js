'use strict';

const { createPerson, getPerson, holdingCounts, listPeople, listPeoplePage, updatePerson } = require('../repositories/people-repo');
const { paginateRows } = require('../pagination');

function queryString(value) {
  if (Array.isArray(value)) return queryString(value[0]);
  if (typeof value !== 'string') return '';
  return value;
}

function requireAdministrator(req, res, next) {
  if (req.principal && req.principal.role === 'administrator') return next();
  const err = new Error('You do not have permission to change people.');
  err.code = 'FORBIDDEN';
  return next(err);
}

function errorDetails(err) {
  if (err && Array.isArray(err.details) && err.details.length) return err.details;
  if (err && err.message) return [err.message];
  return ['The person could not be saved.'];
}

function valuesFrom(body, person) {
  const source = body && typeof body === 'object' ? body : {};
  const current = person || {};
  return {
    name: Object.prototype.hasOwnProperty.call(source, 'name') ? queryString(source.name) : current.name || '',
    email: Object.prototype.hasOwnProperty.call(source, 'email') ? queryString(source.email) : current.email || '',
    note: Object.prototype.hasOwnProperty.call(source, 'note') ? queryString(source.note) : current.note || '',
  };
}

function renderForm(res, status, fields) {
  res.status(status).render('person-form', {
    mode: fields.mode,
    person: fields.person || null,
    values: fields.values,
    errors: fields.errors || [],
  });
}

function peopleHref(search, page) {
  const pairs = [];
  if (search) pairs.push(`q=${encodeURIComponent(search)}`);
  if (page > 1) pairs.push(`page=${page}`);
  return pairs.length ? `/people?${pairs.join('&')}` : '/people';
}

function wholeNumber(value) {
  const text = queryString(value).trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function mountPeopleRoutes(app, db) {
  app.get('/people/options', (req, res) => {
    const page = listPeoplePage(db, queryString(req.query.q), wholeNumber(req.query.offset), wholeNumber(req.query.limit));
    res.json({
      people: page.people.map((person) => ({ id: person.id, name: person.name, email: person.email })),
      total: page.total,
      offset: page.offset,
      limit: page.limit,
    });
  });

  app.get('/people', (req, res) => {
    const search = queryString(req.query.q).trim();
    const counts = holdingCounts(db);
    const pagination = paginateRows(
      listPeople(db, search).map((person) => ({ ...person, holding: counts.get(person.id) || 0 })),
      req.query.page,
      (page) => peopleHref(search, page)
    );
    pagination.label = 'People pages';
    res.render('people', { search, people: pagination.rows, pagination });
  });

  app.get('/people/new', requireAdministrator, (req, res) => {
    renderForm(res, 200, { mode: 'new', values: { name: '', email: '', note: '' } });
  });

  app.post('/people', requireAdministrator, (req, res, next) => {
    const values = valuesFrom(req.body);
    try {
      createPerson(db, values);
      res.redirect(303, '/people');
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        renderForm(res, 400, { mode: 'new', values, errors: errorDetails(err) });
        return;
      }
      next(err);
    }
  });

  app.get('/people/:id/edit', requireAdministrator, (req, res, next) => {
    const person = getPerson(db, req.params.id);
    if (!person) {
      const err = new Error('Person not found.');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    renderForm(res, 200, { mode: 'edit', person, values: valuesFrom({}, person) });
  });

  app.post('/people/:id', requireAdministrator, (req, res, next) => {
    const person = getPerson(db, req.params.id);
    if (!person) {
      const err = new Error('Person not found.');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    const values = valuesFrom(req.body, person);
    try {
      updatePerson(db, person.id, values);
      res.redirect(303, '/people');
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        renderForm(res, 400, { mode: 'edit', person, values, errors: errorDetails(err) });
        return;
      }
      next(err);
    }
  });
}

module.exports = { mountPeopleRoutes };
