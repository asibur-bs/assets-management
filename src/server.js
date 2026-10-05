'use strict';

const path = require('node:path');
const { openDatabase } = require('./db');
const { createApp } = require('./app');

const DEFAULT_DB = path.join(__dirname, '..', 'data', 'assets.sqlite');
const PORT = Number(process.env.PORT || 3000);

function main() {
  const dbPath = process.env.DB_PATH || DEFAULT_DB;
  const db = openDatabase(dbPath);
  const app = createApp(db);
  app.listen(PORT, () => {
    console.log(`Asset tracker listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { main };