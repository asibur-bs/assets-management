'use strict';

const request = require('supertest');

function clientFor(app, auth) {
  function decorate(test) {
    test.set('Cookie', auth.cookie);
    const send = test.send.bind(test);
    test.send = (body) => {
      if (body && typeof body === 'object' && !Array.isArray(body) && !Buffer.isBuffer(body)) {
        if (body._csrf === undefined) body._csrf = auth.csrf;
      }
      return send(body);
    };
    return test;
  }

  const wrapped = (url) => decorate(request(app)(url));
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    wrapped[method] = (url) => decorate(request(app)[method](url));
  }
  return wrapped;
}

module.exports = { clientFor };
