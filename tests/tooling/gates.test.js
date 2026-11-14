'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync, execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..', '..');
const secretScan = path.join(root, 'scripts', 'secret-scan.sh');
const backupScript = path.join(root, 'scripts', 'backup-database.sh');
const smokeScript = path.join(root, 'scripts', 'smoke-deploy.sh');

function localEnv(extra) {
  const env = { ...process.env, ...extra };
  delete env.CI;
  delete env.GITHUB_ACTIONS;
  delete env.GITHUB_BASE_REF;
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  return env;
}

function makeTempGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u6-secret-scan-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'u6@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'u6'], { cwd: dir });
  return dir;
}

function runSecretScan(cwd, env) {
  return spawnSync('bash', [secretScan], {
    cwd,
    env,
    encoding: 'utf8',
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

describe('delivery gates', () => {
  const temps = [];
  let server;

  afterEach(async () => {
    if (server) {
      const child = server;
      server = undefined;
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
        }, 2000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill('SIGTERM');
      });
    }
    while (temps.length > 0) {
      const dir = temps.pop();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('NFR2.4.1 clean — staged benign JS file makes secret-scan exit 0', () => {
    const dir = makeTempGitRepo();
    temps.push(dir);
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'example.js'), "const name = 'ok';\n");
    execFileSync('git', ['add', 'src/example.js'], { cwd: dir });
    const result = runSecretScan(dir, localEnv());
    expect(result.status).toBe(0);
  });

  it('NFR2.4.1 / NFR2.4.2 hit — planted key fails and the secret text is absent', () => {
    const dir = makeTempGitRepo();
    temps.push(dir);
    fs.mkdirSync(path.join(dir, 'src'));
    const secret = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    fs.writeFileSync(path.join(dir, 'src', 'leaky.js'), `const key = '${secret}';\n`);
    execFileSync('git', ['add', 'src/leaky.js'], { cwd: dir });
    const result = runSecretScan(dir, localEnv());
    const out = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(out).not.toContain(secret);
    expect(out).toContain('src/leaky.js');
    expect(out).toContain('aws-access-key');
  });

  it('NFR2.4.1 fail closed — GIT_DIR that is not a repository exits non-zero', () => {
    const bogus = fs.mkdtempSync(path.join(os.tmpdir(), 'u6-not-git-'));
    temps.push(bogus);
    const result = runSecretScan(bogus, localEnv({ GIT_DIR: bogus }));
    expect(result.status).not.toBe(0);
  });

  it('NFR2.4.1 / NFR2.4.3 order — lefthook lists secret-scan, lint, test, coverage, then audit', () => {
    const text = fs.readFileSync(path.join(root, 'lefthook.yml'), 'utf8');
    const secret = text.indexOf('bash scripts/secret-scan.sh');
    const lint = text.indexOf('npm run lint');
    const test = text.indexOf('npm test');
    const coverage = text.indexOf('npm run test:coverage');
    const audit = text.indexOf('npm audit --audit-level=high --omit=dev');
    expect(text).toMatch(/piped:\s*true/);
    expect(secret).toBeGreaterThanOrEqual(0);
    expect(lint).toBeGreaterThan(secret);
    expect(test).toBeGreaterThan(lint);
    expect(coverage).toBeGreaterThan(test);
    expect(audit).toBeGreaterThan(coverage);
  });

  it('NFR2.4.4 / NFR2.4.5 / NFR2.4.3 — workflow permissions, Node pin, and step order', () => {
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read\b/);
    expect(workflow).not.toMatch(/^\s*(packages|contents|id-token|actions|pull-requests|checks):\s*(?!read\b)\S+/m);
    expect(workflow).not.toMatch(/pull_request_target/);
    expect(workflow).toMatch(/node-version:\s*['"]24\.21\.0['"]/);
    const secretIdx = workflow.indexOf('bash scripts/secret-scan.sh');
    const ciIdx = workflow.indexOf('npm ci');
    const lintIdx = workflow.indexOf('npm run lint');
    const testIdx = workflow.indexOf('npm test');
    const coverageIdx = workflow.indexOf('npm run test:coverage');
    const auditIdx = workflow.indexOf('npm audit --audit-level=high --omit=dev');
    expect(secretIdx).toBeGreaterThanOrEqual(0);
    expect(ciIdx).toBeGreaterThan(secretIdx);
    expect(lintIdx).toBeGreaterThan(ciIdx);
    expect(testIdx).toBeGreaterThan(lintIdx);
    expect(coverageIdx).toBeGreaterThan(testIdx);
    expect(auditIdx).toBeGreaterThan(coverageIdx);
  });

  it('NFR3.5.1 — backup copies DB, WAL, and SHM and leaves every timestamp directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u6-backup-'));
    temps.push(tmp);
    const dbPath = path.join(tmp, 'assets.sqlite');
    const backupRoot = path.join(tmp, 'backups');
    fs.writeFileSync(dbPath, Buffer.from('main-db-bytes'));
    fs.writeFileSync(`${dbPath}-wal`, Buffer.from('wal-bytes-here'));
    fs.writeFileSync(`${dbPath}-shm`, Buffer.from('shm-bytes-here'));
    const stamps = ['20260101-000001', '20260101-000002', '20260101-000003', '20260101-000004'];
    for (const stamp of stamps) {
      const result = spawnSync('bash', [backupScript], {
        env: localEnv({
          DB_PATH: dbPath,
          BACKUP_ROOT: backupRoot,
          BACKUP_STAMP: stamp,
        }),
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
    }
    const dirs = fs.readdirSync(backupRoot).sort();
    expect(dirs).toEqual(stamps);
    for (const stamp of dirs) {
      const dest = path.join(backupRoot, stamp);
      expect(fs.readFileSync(path.join(dest, 'assets.sqlite'))).toEqual(Buffer.from('main-db-bytes'));
      expect(fs.readFileSync(path.join(dest, 'assets.sqlite-wal'))).toEqual(Buffer.from('wal-bytes-here'));
      expect(fs.readFileSync(path.join(dest, 'assets.sqlite-shm'))).toEqual(Buffer.from('shm-bytes-here'));
    }
  });

  it('NFR3.5.2 unset — smoke-deploy exits non-zero when SMOKE_BASE_URL is unset', () => {
    const env = localEnv();
    delete env.SMOKE_BASE_URL;
    const result = spawnSync('bash', [smokeScript], {
      cwd: root,
      env,
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
  });

  it('NFR3.5.2 live boundary — register, assign, actor, and audit count pass', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u6-smoke-'));
    temps.push(tmp);
    const dbPath = path.join(tmp, 'assets.sqlite');
    const port = await freePort();
    server = spawn('node', ['src/server.js'], {
      cwd: root,
      env: localEnv({ PORT: String(port), DB_PATH: dbPath }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server did not listen')), 10000);
      const onData = (buf) => {
        if (String(buf).includes('listening')) {
          clearTimeout(timer);
          server.stdout.off('data', onData);
          resolve();
        }
      };
      server.stdout.on('data', onData);
      server.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`server exited early with ${code}`));
      });
    });
    const baseline = path.join(tmp, 'audit-baseline.json');
    fs.writeFileSync(baseline, '[]');
    const result = spawnSync('bash', [smokeScript], {
      cwd: root,
      env: localEnv({
        SMOKE_BASE_URL: `http://127.0.0.1:${port}`,
        DB_PATH: dbPath,
        SMOKE_AUDIT_BASELINE: baseline,
      }),
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
  });
});
