const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const { BlobError, BlobPreconditionFailedError, BlobNotFoundError } = require('@vercel/blob');
const { blobPersistence } = require('../dist/demo/persistence');
const { createDemoStore } = require('../dist/demo/store');
const { createDemoRouter } = require('../dist/demo/routes');

function blobService() {
  let content;
  let version = 0;
  let conflicts = 0;
  let writes = 0;
  return {
    get conflicts() { return conflicts; },
    get writes() { return writes; },
    client: {
      async head() {
        if (content === undefined) throw new BlobNotFoundError();
        return { etag: String(version) };
      },
      async get(_path, options) {
        assert.equal(options.access, 'private');
        assert.equal(options.useCache, false);
        // Capture a snapshot before yielding, as independent function reads would.
        const snapshot = content;
        const etag = String(version);
        await new Promise(resolve => setImmediate(resolve));
        return snapshot === undefined ? null : { statusCode: 200, stream: new Response(snapshot).body, blob: { etag } };
      },
      async put(_path, body, options) {
        assert.equal(options.access, 'private');
        assert.equal(options.addRandomSuffix, false);
        await new Promise(resolve => setImmediate(resolve));
        if (content !== undefined && !options.allowOverwrite) { conflicts++; throw new BlobError('This blob already exists'); }
        if (options.ifMatch && options.ifMatch !== String(version)) { conflicts++; throw new BlobPreconditionFailedError(); }
        content = body; version++; writes++;
        return { etag: String(version) };
      },
    },
  };
}

test('Blob: transport ETags differing from metadata must not break login', async () => {
  const service = blobService();
  const originalGet = service.client.get;
  service.client.get = async (...args) => {
    const result = await originalGet(...args);
    if (result) result.blob.etag = `W/"transport-${result.blob.etag}"`;
    return result;
  };
  const store = createDemoStore(blobPersistence('demo.json', service.client));
  await store.execute({ method: 'get', url: '/equipos' });
  const result = await store.execute({ method: 'post', url: '/auth/login', body: { email: 'demo@preventix.com', password: 'Demo1234' } });
  assert.equal(result.usuario.id, 'u1');
  await store.session('create', 'regression-session', 'u1');
  assert.equal((await store.session('get', 'regression-session')).userId, 'u1');
});

test('Blob: real SDK uses the configured read-write token even when OIDC is present', async t => {
  const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = require('undici');
  const sdk = require('@vercel/blob');
  const names = ['BLOB_READ_WRITE_TOKEN', 'VERCEL_OIDC_TOKEN', 'BLOB_STORE_ID'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const token = 'vercel_blob_rw_teststore_synthetic';
  process.env.BLOB_READ_WRITE_TOKEN = token;
  process.env.VERCEL_OIDC_TOKEN = 'synthetic-oidc';
  process.env.BLOB_STORE_ID = 'store_different';
  const dispatcher = getGlobalDispatcher();
  const mock = new MockAgent(); mock.disableNetConnect(); setGlobalDispatcher(mock);
  t.after(async () => {
    setGlobalDispatcher(dispatcher); await mock.close();
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  });
  mock.get('https://teststore.private.blob.vercel-storage.com')
    .intercept({ method: 'GET', path: '/demo.json?cache=0', headers: { authorization: 'Bearer ' + token } })
    .reply(404, '');
  let saved = false;
  const client = { get: sdk.get, head: sdk.head, put: async (_path, _body, options) => { assert.equal(options.token, token); saved = true; } };
  await blobPersistence('demo.json', client).transaction(async () => ({ value: 0 }), async data => { data.value = 1; });
  assert.ok(saved); mock.assertNoPendingInterceptors();
});

test('Blob: independent instances retry conflicting writes without losing records', async () => {
  const service = blobService();
  const stores = [0, 1, 2].map(() => createDemoStore(blobPersistence('demo.json', service.client)));
  await Promise.all(stores.map((store, i) => store.execute({ method: 'post', url: '/equipos', body: { nombre: `Equipo ${i}`, tipo: 'laptop', estado: 'activo' } })));
  const equipos = await stores[0].execute({ method: 'get', url: '/equipos' });
  assert.equal(equipos.length, 8);
  assert.ok(service.conflicts > 0);
  const writes = service.writes;
  await stores[1].execute({ method: 'get', url: '/equipos' });
  assert.equal(service.writes, writes, 'read-only requests should not rewrite the blob');
});

test('Blob HTTP: login, refresh, data and logout survive switching function instances', async t => {
  const service = blobService();
  const servers = [];
  t.after(async () => { await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))); });
  async function instance() {
    const app = express(); app.use(express.json()); app.use(cookieParser());
    app.use('/api', createDemoRouter(blobPersistence('demo.json', service.client), 'shared-secret-between-function-instances', true));
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}/api`;
  }
  const first = await instance();
  const login = await fetch(first + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@preventix.com', password: 'Demo1234' }) });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /Secure/);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  const token = (await login.json()).data.accessToken;
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const second = await instance();
  const headers = { Authorization: 'Bearer ' + token, Cookie: cookie, 'Content-Type': 'application/json' };
  assert.equal((await fetch(second + '/equipos', { headers })).status, 200);
  assert.equal((await fetch(second + '/auth/refresh', { method: 'POST', headers })).status, 200);
  const created = await fetch(second + '/equipos', { method: 'POST', headers, body: JSON.stringify({ nombre: 'Equipo compartido', tipo: 'desktop' }) });
  assert.equal(created.status, 200);
  const third = await instance();
  const list = await fetch(third + '/equipos', { headers });
  assert.equal((await list.json()).data.length, 6);
  assert.equal((await fetch(third + '/auth/logout', { method: 'POST', headers })).status, 200);
  assert.equal((await fetch(first + '/equipos', { headers })).status, 401);
  assert.equal((await fetch(second + '/auth/refresh', { method: 'POST', headers })).status, 401);
});

test('Vercel Function: exports a working handler and explains missing configuration', async t => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  t.after(() => { if (previous === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = previous; });
  const handler = require('../../api/index');
  const server = await new Promise(resolve => { const s = handler.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/health')).status, 200);
  const response = await fetch(base + '/api/equipos');
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /BLOB_READ_WRITE_TOKEN/);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
