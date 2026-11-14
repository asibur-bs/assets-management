'use strict';

// Resolved from the server process environment. No parameter, so a request
// body, query, or header cannot be the source.

function resolveActor() {
  const configured = process.env.ASSET_ACTOR;
  if (typeof configured !== 'string') return 'system';
  const actor = configured.trim();
  return actor.length > 0 ? actor : 'system';
}

module.exports = { resolveActor };
