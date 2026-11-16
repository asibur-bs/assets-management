'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');
const { runAsPrincipal } = require('../src/auth/principal');
const { resetAttempts, noteFailure, MAX_FAILURES } = require('../src/auth/throttle');
const { createUser, updateUser } = require('../src/auth/users');
const service = require('../src/services/asset-service');
const { openSession } = require('./helpers/auth');
const { clientFor } = require('./helpers/http');

const root = path.join(__dirname, '..');

function administrator(db, username, displayName) {
  return openSession(db, {
    username,
    displayName,
    password: 'password-1',
    role: 'administrator',
  });
}

describe('sign-in, roles, and users', () => {
  let app;
  let db;

  beforeEach(() => {
    resetAttempts();
    db = openDatabase(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    resetAttempts();
    if (db) db.close();
  });

  it('sends an anonymous visitor to the sign-in page', async () => {
    const res = await request(app).get('/assets');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/sign-in?next=%2Fassets');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('signs in, shows the person, and signs out', async () => {
    createUser(db, {
      username: 'ada',
      displayName: 'Ada Lovelace',
      password: 'password-1',
      role: 'administrator',
    });
    const agent = request.agent(app);
    const page = await agent.get('/sign-in');
    expect(page.status).toBe(200);
    expect(page.text).toContain('data-testid="sign-in-form"');

    const refused = await agent.post('/sign-in').type('form').send({ username: 'ada', password: 'wrong-password' });
    expect(refused.status).toBe(401);
    expect(refused.text).toContain('The username or password is not valid.');
    expect(refused.text).not.toContain('password-1');

    const signedIn = await agent.post('/sign-in').type('form').send({ username: 'ada', password: 'password-1' });
    expect(signedIn.status).toBe(303);
    expect(signedIn.headers.location).toBe('/assets');
    expect(signedIn.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
    expect(signedIn.headers['set-cookie'].join(';')).toMatch(/SameSite=Lax/i);

    const home = await agent.get('/assets');
    expect(home.status).toBe(200);
    expect(home.text).toContain('Acting as: Ada Lovelace');
    expect(home.text).toContain('data-testid="nav-users"');
    expect(home.text).toContain('data-testid="nav-profile"');
    expect(home.text).toContain('data-testid="sign-out"');
    const csrf = home.text.match(/name="_csrf" value="([^"]+)"/)[1];

    const signedOut = await agent.post('/sign-out').type('form').send({ _csrf: csrf });
    expect(signedOut.status).toBe(303);
    expect(signedOut.headers.location).toBe('/sign-in');
    const again = await agent.get('/assets');
    expect(again.status).toBe(302);
    expect(again.headers.location).toContain('/sign-in');
  });

  it('rejects a state-changing form that has no token', async () => {
    const auth = administrator(db, 'ada', 'Ada');
    const before = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    const res = await request(app)
      .post('/assets')
      .set('Cookie', auth.cookie)
      .type('form')
      .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-1' });
    expect(res.status).toBe(403);
    expect(res.text).toContain('could not be confirmed');
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(before);
  });

  it('stores only a hash of the session id', () => {
    const auth = administrator(db, 'ada', 'Ada');
    const raw = decodeURIComponent(auth.cookie.split('=')[1]);
    const rows = db.prepare('SELECT id_hash FROM sessions').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id_hash).not.toBe(raw);
    expect(rows[0].id_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives a reader the asset list and refuses changes and user management', async () => {
    const reader = openSession(db, {
      username: 'rio',
      displayName: 'Rio',
      password: 'password-1',
      role: 'reader',
    });
    const client = clientFor(app, reader);
    const list = await client.get('/assets');
    expect(list.status).toBe(200);
    expect(list.text).toContain('Acting as: Rio');
    expect(list.text).not.toContain('data-testid="nav-users"');
    expect(list.text).toContain('data-testid="nav-profile"');
    expect(list.text).not.toContain('data-testid="nav-new"');
    expect(list.text).toContain('data-testid="sign-out"');

    const users = await client.get('/users');
    expect(users.status).toBe(403);
    const created = await client
      .post('/assets')
      .type('form')
      .send({ category: 'hardware', name: 'ThinkPad', serial_or_key: 'TP-2' });
    expect(created.status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(0);

    const anon = await request(app).get('/profile');
    expect(anon.status).toBe(302);
    expect(anon.headers.location).toContain('/sign-in');

    const profile = await client.get('/profile');
    expect(profile.status).toBe(200);
    expect(profile.text).toContain('data-testid="profile-name"');
    expect(profile.text).toContain('Rio');
    expect(profile.text).toContain('@rio');
    expect(profile.text).toContain('Reader');
    expect(profile.text).toContain('Active');
    expect(profile.text).toContain('href="/profile"');
    expect(profile.text).toContain('aria-current="page"');
    expect(profile.text).not.toContain('password');
  });

  it('lets an administrator create a reader and keeps that reader from removing the last administrator', async () => {
    const admin = administrator(db, 'ada', 'Ada');
    const client = clientFor(app, admin);
    const created = await client.post('/users').type('form').send({
      username: 'rio',
      display_name: 'Rio',
      role: 'reader',
      password: 'password-1',
    });
    expect(created.status).toBe(303);
    expect(created.headers.location).toBe('/users');
    const list = await client.get('/users');
    expect(list.text).toContain('rio');
    expect(list.text).toContain('Reader');
    expect(list.text).not.toContain('password-1');

    const self = await client.post(`/users/${admin.user.id}`).type('form').send({
      display_name: 'Ada',
      role: 'reader',
      password: '',
    });
    expect(self.status).toBe(400);
    expect(self.text).toContain('last active administrator');
    const stillAdmin = db.prepare('SELECT role FROM users WHERE id = ?').get(admin.user.id);
    expect(stillAdmin.role).toBe('administrator');
  });

  it('refuses a disabled account and drops its session', async () => {
    const admin = administrator(db, 'ada', 'Ada');
    createUser(db, {
      username: 'rio',
      displayName: 'Rio',
      password: 'password-1',
      role: 'reader',
    });
    const readerSession = openSession(db, {
      username: 'noel',
      displayName: 'Noel',
      password: 'password-1',
      role: 'reader',
    });
    updateUser(db, readerSession.user.id, { disabled: true }, admin.user.id);
    const client = clientFor(app, readerSession);
    const res = await client.get('/assets');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/sign-in');

    const signedIn = await request(app).post('/sign-in').type('form').send({ username: 'rio', password: 'password-1' });
    expect(signedIn.status).toBe(303);
    const disabled = await request(app)
      .post('/sign-in')
      .type('form')
      .send({ username: 'noel', password: 'password-1' });
    expect(disabled.status).toBe(401);
    expect(disabled.text).toContain('The username or password is not valid.');
  });

  it('uses one failure message after repeated attempts', async () => {
    createUser(db, {
      username: 'ada',
      displayName: 'Ada',
      password: 'password-1',
      role: 'administrator',
    });
    for (let i = 0; i < MAX_FAILURES; i += 1) noteFailure('ada');
    const res = await request(app).post('/sign-in').type('form').send({ username: 'ada', password: 'password-1' });
    expect(res.status).toBe(401);
    expect(res.text).toContain('The username or password is not valid.');
  });

  it('records the signed-in display name when a reader is blocked in the service', () => {
    const reader = {
      id: 'reader',
      displayName: 'Rio',
      role: 'reader',
    };
    expect(() => {
      runAsPrincipal(reader, () => {
        service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X' });
      });
    }).toThrow(/permission/);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(0);

    runAsPrincipal({ id: 'admin', displayName: 'Ada Lovelace', role: 'administrator' }, () => {
      service.registerAsset(db, { category: 'hardware', name: 'A', serialOrKey: 'X', actor: 'Mallory' });
    });
    const audit = db.prepare('SELECT actor FROM audit_log').get();
    expect(audit.actor).toBe('Ada Lovelace');
  });
});

describe('create-admin', () => {
  it('creates the first administrator and refuses a second one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-admin-'));
    const dbPath = path.join(dir, 'assets.sqlite');
    const env = {
      ...process.env,
      DB_PATH: dbPath,
      ASSET_ADMIN_USERNAME: 'ada',
      ASSET_ADMIN_DISPLAY_NAME: 'Ada Lovelace',
      ASSET_ADMIN_PASSWORD: 'password-1',
    };
    const first = spawnSync('node', ['src/create-admin.js'], { cwd: root, env, encoding: 'utf8' });
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('Created administrator ada.');
    const second = spawnSync('node', ['src/create-admin.js'], { cwd: root, env, encoding: 'utf8' });
    expect(second.status).toBe(1);
    expect(second.stderr).toContain('already exists');
    const db = openDatabase(dbPath);
    try {
      const row = db.prepare('SELECT username, role, password_hash FROM users').get();
      expect(row.username).toBe('ada');
      expect(row.role).toBe('administrator');
      expect(row.password_hash).not.toContain('password-1');
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
