'use strict';

const express = require('express');
const { requireWriter } = require('../auth/guard');
const repo = require('../repositories/assets-repo');
const { countPeople, getPerson, listPeople } = require('../repositories/people-repo');
const service = require('../services/asset-service');
const { paginateRows } = require('../pagination');
const { translate } = require('../domain/translation');
const {
  STATUS_VALUES,
  TRANSITION_EDGES,
  UNASSIGNED_DESIGNATION,
  acceptableReasonsFor,
  findTransition,
  holderDimensionMatches,
  sanitizeAssetFilter,
  statusLabel,
} = require('../domain/vocabulary');

const REASON_ACTIONS = new Set(['mark-lost', 'discarded', 'recovered']);

const ACTION_TO = {
  assign: 'assigned',
  return: 'returned',
  'mark-lost': 'lost',
  recovered: 'in-stock',
  discarded: 'discarded',
};

const ACTION_META = {
  assign: {
    action: 'assign',
    submitLabel: 'Assign',
    testId: 'action-assign',
  },
  return: {
    action: 'return',
    submitLabel: 'Mark returned',
    testId: 'action-return',
  },
  'mark-lost': {
    action: 'mark-lost',
    submitLabel: 'Mark lost',
    testId: 'action-mark-lost',
    heading: (name) => `Mark lost — ${name}`,
  },
  discarded: {
    action: 'discarded',
    submitLabel: 'Discard asset',
    testId: 'action-discard',
    heading: (name) => `Discard asset — ${name}`,
  },
  recovered: {
    action: 'recovered',
    submitLabel: 'Recover asset',
    testId: 'action-recover',
    heading: (name) => `Recover asset — ${name}`,
    reasonLabel: 'Recovery reason',
  },
};

function notFound() {
  const err = new Error('Asset not found.');
  err.code = 'NOT_FOUND';
  return err;
}

function queryString(value) {
  if (Array.isArray(value)) return queryString(value[0]);
  if (typeof value !== 'string') return '';
  return value;
}

function optionalText(value) {
  const text = queryString(value).trim();
  return text.length > 0 ? text : null;
}

function formValues(source) {
  return {
    category: queryString(source.category),
    name: queryString(source.name),
    serial_or_key: queryString(source.serial_or_key),
    model: queryString(source.model),
    notes: queryString(source.notes),
  };
}

function blankFormValues() {
  return { category: 'hardware', name: '', serial_or_key: '', model: '', notes: '' };
}

function registerInput(body) {
  return {
    category: queryString(body.category),
    name: queryString(body.name).trim(),
    serialOrKey: queryString(body.serial_or_key).trim(),
    model: optionalText(body.model),
    notes: optionalText(body.notes),
  };
}

function errorList(err) {
  return Array.isArray(err.details) && err.details.length ? err.details : [err.message];
}

function presentCollision(existing, serial) {
  if (!existing) return null;
  return {
    category: existing.category,
    serial: serial || existing.serial_or_key,
    name: existing.name,
    href: `/assets/${existing.id}`,
  };
}

function newFormLocals(extras) {
  return Object.assign(
    {
      values: blankFormValues(),
      errors: [],
      warning: null,
      collision: null,
      formAction: '/assets',
      checkAction: '/assets/serial-check',
      formTestId: 'new-form',
      submitLabel: 'Create asset',
      hiddenAction: '',
    },
    extras
  );
}

function editFormLocals(id, extras) {
  return Object.assign(
    {
      errors: [],
      warning: null,
      collision: null,
      formAction: `/assets/${id}/edit`,
      checkAction: `/assets/${id}/serial-check`,
      formTestId: 'edit-form',
      submitLabel: 'Save changes',
      hiddenAction: 'edit',
    },
    extras
  );
}

function holderName(value) {
  return typeof value === 'string' && value.length > 0 ? value : 'nobody';
}

function consequenceFor(asset, edge) {
  const current = holderName(asset.assigned_to);
  const previous = holderName(asset.last_assigned_to);
  if (edge.auditAction === 'mark-lost' && asset.status === 'assigned') {
    return `This asset is currently assigned to ${current}. Marking it lost records who had it and ends the assignment. ${current} is kept as the last holder.`;
  }
  if (edge.auditAction === 'mark-lost' && asset.status === 'in-stock') {
    return 'This asset is in stock. It has not been assigned to anyone. Marking it lost records it as missing, and there is no holder to keep.';
  }
  if (edge.auditAction === 'mark-lost' && asset.status === 'returned') {
    return `This asset was returned by ${previous} and is not currently assigned. Marking it lost records the loss and keeps ${previous} as the last holder.`;
  }
  if (edge.auditAction === 'discarded') {
    return `This asset is currently assigned to ${current}. Discarding it resolves the assignment: ${current} is cleared as the current holder and kept as the last holder. The asset leaves Active Inventory, but its row and full history are kept and stay here.`;
  }
  if (edge.auditAction === 'recovered') {
    return `This asset was marked lost. ${previous} was its last holder. Recovering it returns it to stock and records the recovery as its own event, naming ${previous}.`;
  }
  return '';
}

function actionsFor(asset) {
  return TRANSITION_EDGES.filter((edge) => edge.from === asset.status).map((edge) => {
    const meta = ACTION_META[edge.auditAction];
    return {
      action: meta.action,
      to: edge.to,
      submitLabel: meta.submitLabel,
      testId: meta.testId,
      reasonRequired: edge.reasonRequired === true,
      reasonLabel: meta.reasonLabel || 'Reason',
      reasons: edge.reasonRequired ? acceptableReasonsFor(edge.reasonSet) : [],
      consequence: edge.reasonRequired ? consequenceFor(asset, edge) : '',
      heading: meta.heading ? meta.heading(asset.name) : '',
    };
  });
}

function historyFor(db, id, audit) {
  if (Array.isArray(audit)) return audit;
  return repo.listAudit(db, id);
}

function loadDetail(db, id) {
  const data = service.getAssetWithAudit(db, id);
  if (!data || !data.asset) return null;
  return { asset: data.asset, audit: historyFor(db, id, data.audit) };
}

function readFilter(query) {
  return sanitizeAssetFilter({
    search_text: queryString(query.search_text),
    category: queryString(query.category),
    status: queryString(query.status),
    sort_column: queryString(query.sort_column),
    sort_direction: queryString(query.sort_direction),
    holder: queryString(query.holder),
  });
}

function formFilters(sanitized) {
  return {
    search_text: sanitized.search_text || '',
    category: sanitized.category || '',
    status: sanitized.status || '',
    sort_column: sanitized.sort_column || 'name',
    sort_direction: sanitized.sort_direction || 'asc',
    holder: sanitized.holder || '',
  };
}

function exportQuery(filters) {
  const pairs = [];
  const add = (key, value) => {
    if (value) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  };
  add('search_text', filters.search_text);
  add('category', filters.category);
  add('status', filters.status);
  add('sort_column', filters.sort_column || 'name');
  add('sort_direction', filters.sort_direction || 'asc');
  add('holder', filters.holder);
  return pairs.join('&');
}


function listHref(filters, page) {
  const pairs = [];
  const add = (key, value) => {
    if (value) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  };
  add('search_text', filters.search_text);
  add('category', filters.category);
  add('status', filters.status);
  if (filters.sort_column && filters.sort_column !== 'name') add('sort_column', filters.sort_column);
  if (filters.sort_direction && filters.sort_direction !== 'asc') add('sort_direction', filters.sort_direction);
  add('holder', filters.holder);
  if (page > 1) add('page', String(page));
  const query = pairs.join('&');
  return query.length > 0 ? `/assets?${query}` : '/assets';
}

function paginate(filters, rows, requestedPage) {
  const page = paginateRows(rows, requestedPage, (number) => listHref(filters, number));
  return {
    assets: page.rows,
    matching: page.matching,
    page: page.page,
    pageCount: page.pageCount,
    rangeStart: page.rangeStart,
    rangeEnd: page.rangeEnd,
    prevHref: page.prevHref,
    nextHref: page.nextHref,
    pages: page.pages,
    label: 'Asset pages',
  };
}

function listRows(db, sanitized) {
  const rows = service.listAssets(db, {
    q: sanitized.search_text || null,
    category: sanitized.category || null,
    status: sanitized.status || null,
    sort: sanitized.sort_column || 'name',
    dir: sanitized.sort_direction || 'asc',
  });
  if (!sanitized.holder) return rows;
  return rows.filter((asset) => holderDimensionMatches(asset.assigned_to, asset.last_assigned_to, sanitized.holder));
}

function advisoryWarning(db, values, excludeId) {
  if (!values.category || !queryString(values.serial_or_key).trim()) return null;
  const preview = service.previewSerialCollision(db, {
    category: values.category,
    serialOrKey: values.serial_or_key,
    excludeId: excludeId == null ? null : excludeId,
  });
  if (!preview.collision) return null;
  return presentCollision(preview.existingAsset, values.serial_or_key);
}

function sendRefused(res, err) {
  const translated = translate(err.code);
  const known = translated.code === err.code;
  res.status(known ? translated.status : 500).render('error', {
    message: known ? err.message : 'Unexpected error.',
    code: known ? translated.code : 'INTERNAL',
  });
}

function pickNumber(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null) return source[key];
    }
  }
  return 0;
}

function presentFigures(result) {
  const src = result && result.figures && typeof result.figures === 'object' ? result.figures : result || {};
  const buckets = src.bucket_counts || src.bucketCounts || {};
  return {
    in_stock_count: pickNumber([src, buckets], ['in_stock_count', 'in-stock']),
    assigned_count: pickNumber([src, buckets], ['assigned_count', 'assigned']),
    returned_count: pickNumber([src, buckets], ['returned_count', 'returned']),
    lost_count: pickNumber([src, buckets], ['lost_count', 'lost']),
    discarded_count: pickNumber([src, buckets], ['discarded_count', 'discarded']),
    active_inventory_count: pickNumber([src], ['active_inventory_count', 'active_inventory', 'activeInventory']),
    total_record_count: pickNumber([src], ['total_record_count', 'total_records', 'totalRecords']),
    available_to_assign_count: pickNumber(
      [src],
      ['available_to_assign_count', 'available_to_assign', 'availableToAssign']
    ),
  };
}

function tilesFrom(figures) {
  return STATUS_VALUES.map((status) => ({
    status,
    label: statusLabel(status),
    count: status === 'in-stock' ? figures.in_stock_count : figures[`${status}_count`],
    href: `/assets?status=${encodeURIComponent(status)}`,
  }));
}

function chipCount(chips, status) {
  if (!chips) return 0;
  if (Array.isArray(chips)) {
    const found = chips.find((chip) => chip && (chip.status === status || chip.name === status));
    return found ? Number(found.count ?? found.total ?? 0) : 0;
  }
  const underscored = status.replace('-', '_');
  const value = chips[status] ?? chips[underscored] ?? chips[`${underscored}_count`];
  return value == null ? 0 : Number(value);
}

function chipEntries(chips) {
  return STATUS_VALUES.map((status) => ({
    status,
    label: statusLabel(status),
    count: chipCount(chips, status),
  }));
}

function stringField(row, keys) {
  for (const key of keys) {
    if (typeof row[key] === 'string' && row[key].length > 0) return row[key];
  }
  return '';
}

function presentHolders(result) {
  const source = Array.isArray(result) ? { holders: result } : result || {};
  const holders = Array.isArray(source.holders) ? source.holders : Array.isArray(source.rows) ? source.rows : [];
  const rows = holders
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const name = stringField(row, ['name', 'displayHolder', 'display_holder', 'holder']);
      const chipSource = row.chips || row.bucket_counts || row.buckets || row.counts;
      const chips = chipSource ? chipEntries(chipSource) : [];
      const total =
        row.total != null
          ? row.total
          : row.count != null
            ? row.count
            : chips.reduce((sum, chip) => sum + chip.count, 0);
      const neverHeld = row.neverHeld === true || row.isHolder === false || name === UNASSIGNED_DESIGNATION;
      return {
        name,
        total,
        chips,
        neverHeld,
        href: `/assets?holder=${encodeURIComponent(name)}`,
      };
    });
  let holderCount = rows.filter((row) => !row.neverHeld).length;
  if (source.holder_count != null) holderCount = source.holder_count;
  else if (source.holderCount != null) holderCount = source.holderCount;
  return { rows, holderCount };
}

function assetsRouter(db) {
  const router = express.Router();

  router.use((req, res, next) => {
    const writingPage = req.path === '/new' || req.path.endsWith('/edit') || req.path.endsWith('/serial-check');
    if ((req.method === 'GET' || req.method === 'HEAD') && !writingPage) return next();
    return requireWriter(req, res, next);
  });

  function renderDetail(res, loaded, statusCode, extras) {
    const holderPerson = loaded.asset.assigned_person_id ? getPerson(db, loaded.asset.assigned_person_id) : null;
    const lastHolderPerson = loaded.asset.last_assigned_person_id
      ? getPerson(db, loaded.asset.last_assigned_person_id)
      : null;
    res.status(statusCode).render(
      'detail',
      Object.assign(
        {
          asset: loaded.asset,
          audit: loaded.audit,
          actions: actionsFor(loaded.asset),
          alert: null,
          reasonError: null,
          peopleCount: countPeople(db),
          holderPerson,
          lastHolderPerson,
        },
        extras
      )
    );
  }

  router.get('/', (req, res, next) => {
    try {
      const sanitized = readFilter(req.query);
      const filters = formFilters(sanitized);
      const page = paginate(filters, listRows(db, sanitized), req.query.page);
      res.render('list', {
        assets: page.assets,
        filters,
        exportQuery: exportQuery(filters),
        shown: page.assets.length,
        matching: page.matching,
        pagination: page,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/export', (req, res, next) => {
    try {
      const { queryAssets } = require('../reporting/query');
      const { renderCsv, CSV_FILENAME, CSV_CONTENT_TYPE } = require('../reporting/csv');
      const rows = queryAssets(db, req.query);
      res.setHeader('Content-Type', CSV_CONTENT_TYPE);
      res.setHeader('Content-Disposition', `attachment; filename="${CSV_FILENAME}"`);
      res.send(renderCsv(rows));
    } catch (err) {
      next(err);
    }
  });

  router.get('/new', (req, res) => {
    res.render('new', newFormLocals({}));
  });

  router.get('/serial-check', (req, res, next) => {
    try {
      const values = formValues(req.query);
      if (!values.category) values.category = 'hardware';
      const warning = advisoryWarning(db, values, null);
      res.render('new', newFormLocals({ values, warning }));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    const input = registerInput(req.body);
    try {
      const asset = service.registerAsset(db, input);
      res.redirect(303, `/assets/${asset.id}`);
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE_ASSET') {
        const values = formValues(req.body);
        const collision =
          err.code === 'DUPLICATE_ASSET'
            ? advisoryWarning(db, { ...values, serial_or_key: input.serialOrKey }, null)
            : null;
        return res.status(translate(err.code).status).render(
          'new',
          newFormLocals({
            values,
            errors: errorList(err),
            collision,
          })
        );
      }
      next(err);
    }
  });

  router.get('/:id/edit', (req, res, next) => {
    try {
      const loaded = loadDetail(db, req.params.id);
      if (!loaded) return next(notFound());
      const asset = loaded.asset;
      res.render(
        'edit',
        editFormLocals(asset.id, {
          asset,
          values: {
            category: asset.category,
            name: asset.name,
            serial_or_key: asset.serial_or_key || '',
            model: asset.model || '',
            notes: asset.notes || '',
          },
        })
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/serial-check', (req, res, next) => {
    try {
      const loaded = loadDetail(db, req.params.id);
      if (!loaded) return next(notFound());
      const asset = loaded.asset;
      const submitted = formValues(req.query);
      const hasQuery = ['category', 'name', 'serial_or_key', 'model', 'notes'].some(
        (key) => queryString(req.query[key]).length > 0
      );
      const values = hasQuery
        ? submitted
        : {
            category: asset.category,
            name: asset.name,
            serial_or_key: asset.serial_or_key || '',
            model: asset.model || '',
            notes: asset.notes || '',
          };
      const warning = hasQuery ? advisoryWarning(db, values, asset.id) : null;
      res.render('edit', editFormLocals(asset.id, { asset, values, warning }));
    } catch (err) {
      next(err);
    }
  });

  function saveEdit(req, res, next) {
    const id = req.params.id;
    const loaded = loadDetail(db, id);
    if (!loaded) return next(notFound());
    const input = registerInput(req.body);
    try {
      service.editAsset(db, id, input);
      res.redirect(303, `/assets/${id}`);
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE_ASSET') {
        const values = formValues(req.body);
        const collision =
          err.code === 'DUPLICATE_ASSET'
            ? advisoryWarning(db, { ...values, serial_or_key: input.serialOrKey }, id)
            : null;
        return res.status(translate(err.code).status).render(
          'edit',
          editFormLocals(id, {
            asset: loaded.asset,
            values,
            errors: errorList(err),
            collision,
          })
        );
      }
      next(err);
    }
  }

  function refuseDelete(req, res, next) {
    try {
      service.deleteAsset(db, req.params.id);
      res.redirect(303, '/assets');
    } catch (err) {
      if (err && err.code) return sendRefused(res, err);
      next(err);
    }
  }

  router.post('/:id/edit', (req, res, next) => {
    if (queryString(req.body.action) !== 'edit') {
      const err = new Error('action is required.');
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    return saveEdit(req, res, next);
  });

  router.post('/:id/delete', (req, res, next) => {
    refuseDelete(req, res, next);
  });

  router.get('/:id', (req, res, next) => {
    try {
      const loaded = loadDetail(db, req.params.id);
      if (!loaded) return next(notFound());
      renderDetail(res, loaded, 200, {});
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/assign', (req, res, next) => {
    req.body.action = 'assign';
    postTransition(req, res, next);
  });

  router.post('/:id', (req, res, next) => {
    postTransition(req, res, next);
  });

  function postTransition(req, res, next) {
    const id = req.params.id;
    const action = queryString(req.body.action);
    if (action === 'delete') return refuseDelete(req, res, next);
    if (action === 'edit') return saveEdit(req, res, next);
    const to = ACTION_TO[action];
    if (!to) {
      const err = new Error('action is required.');
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const reason = queryString(req.body.reason);
    let assignee = queryString(req.body.holder).trim() || queryString(req.body.assigned_to).trim();
    let personId = null;
    let personEmail = null;
    const postedPerson = queryString(req.body.person_id).trim();
    if (to === 'assigned' && postedPerson) {
      const person = getPerson(db, postedPerson);
      if (!person) {
        const loaded = loadDetail(db, id);
        if (!loaded) return next(notFound());
        return renderDetail(res, loaded, translate('VALIDATION_ERROR').status, {
          alert: 'Choose a person from the list.',
        });
      }
      assignee = person.name;
      personId = person.id;
      personEmail = person.email;
    }

    if (REASON_ACTIONS.has(action)) {
      const loaded = loadDetail(db, id);
      if (!loaded) return next(notFound());
      const edge = findTransition(loaded.asset.status, to);
      if (edge && edge.reasonRequired && !reason) {
        return renderDetail(res, loaded, translate('VALIDATION_ERROR').status, {
          reasonError: { action, message: 'A reason is required.' },
        });
      }
      if (edge && edge.reasonRequired && !acceptableReasonsFor(edge.reasonSet).includes(reason)) {
        return renderDetail(res, loaded, translate('VALIDATION_ERROR').status, {
          reasonError: { action, message: 'reason is not acceptable for this transition.' },
        });
      }
    }

    try {
      service.transitionAsset(db, id, { to, assignee, reason, personId, personEmail });
      res.redirect(303, `/assets/${id}`);
    } catch (err) {
      const loaded = loadDetail(db, id);
      if (err.code === 'NOT_FOUND' || !loaded) return next(err.code === 'NOT_FOUND' ? err : notFound());
      if (err.code === 'INVALID_TRANSITION') {
        return renderDetail(res, loaded, translate(err.code).status, {
          alert: `That change is not available for this asset's current status. The asset is now ${statusLabel(loaded.asset.status)}.`,
        });
      }
      if (err.code === 'VALIDATION_ERROR') {
        return renderDetail(res, loaded, translate(err.code).status, {
          alert: err.message,
          reasonError: REASON_ACTIONS.has(action) ? { action, message: err.message } : null,
        });
      }
      next(err);
    }
  }

  return router;
}


function mountAuxiliaryRoutes(app, db) {
  app.get('/dashboard', (req, res, next) => {
    try {
      const { countFigures } = require('../reporting/query');
      const figures = presentFigures(countFigures(db, {}));
      res.render('dashboard', { figures, tiles: tilesFrom(figures) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/holders', (req, res, next) => {
    try {
      const { listHolders } = require('../reporting/query');
      const search = queryString(req.query.holder_search);
      const presented = presentHolders(listHolders(db, search.length > 0 ? search : null));
      res.render('holders', { search, rows: presented.rows, holderCount: presented.holderCount });
    } catch (err) {
      next(err);
    }
  });
}

assetsRouter.mountAuxiliaryRoutes = mountAuxiliaryRoutes;

module.exports = assetsRouter;
