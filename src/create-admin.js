'use strict';

const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { openDatabase } = require('./db');
const { countActiveAdministrators, createUser } = require('./auth/users');

const DEFAULT_DB = path.join(__dirname, '..', 'data', 'assets.sqlite');

function credentialsFromEnv() {
  const username = process.env.ASSET_ADMIN_USERNAME;
  const displayName = process.env.ASSET_ADMIN_DISPLAY_NAME;
  const password = process.env.ASSET_ADMIN_PASSWORD;
  if (!username && !displayName && !password) return null;
  if (!username || !displayName || !password) {
    throw new Error('Set ASSET_ADMIN_USERNAME, ASSET_ADMIN_DISPLAY_NAME, and ASSET_ADMIN_PASSWORD together.');
  }
  return { username, displayName, password };
}

async function promptCredentials() {
  if (!stdin.isTTY) {
    throw new Error('Set ASSET_ADMIN_USERNAME, ASSET_ADMIN_DISPLAY_NAME, and ASSET_ADMIN_PASSWORD.');
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const username = (await rl.question('Username: ')).trim();
    const displayName = (await rl.question('Display name: ')).trim();
    const password = await rl.question('Password: ');
    stdout.write('\n');
    return { username, displayName, password };
  } finally {
    rl.close();
  }
}

async function main() {
  const dbPath = process.env.DB_PATH || DEFAULT_DB;
  const db = openDatabase(dbPath);
  try {
    if (countActiveAdministrators(db) > 0) {
      console.error('An active administrator already exists.');
      process.exitCode = 1;
      return;
    }
    const credentials = credentialsFromEnv() || (await promptCredentials());
    const user = createUser(db, { ...credentials, role: 'administrator' });
    console.log(`Created administrator ${user.username}.`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
