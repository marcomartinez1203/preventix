const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, unlink, rmdir } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createDemoRouter } = require('../dist/demo/routes');

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'preventix-http-test-'));
  const file = path.join(directory, 'demo.json');
  let server;
  const start = async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', createDemoRouter(file, 'test-secret-only-for-isolated-http-tests'));
    await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    return `http://127.0.0.1:${server.address().port}`;
  };
  const close = () => new Promise(resolve => server.close(resolve));
  let base = await start();
  let token;
  let cookie;
  async function request(method, url, body, authenticated = true) {
    const response = await fetch(base + '/api' + url, {
      method, headers: { 'Content-Type': 'application/json', ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json();
    return { status: response.status, data: json.data, message: json.message, cookie: response.headers.get('set-cookie') };
  }
  async function login(email = 'demo@preventix.com', password = 'Demo1234') {
    const result = await request('POST', '/auth/login', { email, password }, false);
    if (result.status === 200) { token = result.data.accessToken; cookie = result.cookie.split(';')[0]; }
    return result;
  }
  t.after(async () => {
    await close();
    for (const name of ['demo.json', 'demo.json.tmp']) await unlink(path.join(directory, name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  });
  return { request, login, file, restart: async () => { await close(); base = await start(); token = undefined; cookie = undefined; } };
}

test('HTTP: predefined user, protected routes, cookie refresh and logout', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('GET', '/equipos', undefined, false)).status, 401);
  assert.equal((await f.login('demo@preventix.com', 'wrong')).status, 401);
  const login = await f.login();
  assert.equal(login.status, 200);
  assert.equal(login.data.usuario.rol, 'administrador');
  assert.match(login.cookie, /HttpOnly/);
  const refresh = await f.request('POST', '/auth/refresh', {}, false);
  assert.equal(refresh.status, 200);
  assert.ok(refresh.data.accessToken);
  assert.equal((await f.request('GET', '/equipos')).data.length, 5);
  assert.equal((await f.request('POST', '/auth/logout', {})).status, 200);
  assert.equal((await f.request('POST', '/auth/refresh', {}, false)).status, 401);
  assert.equal((await f.request('GET', '/equipos')).status, 401);
});

test('HTTP: equipment, failure and maintenance update metrics and survive backend restart', async t => {
  const f = await fixture(t); await f.login();
  const baseline = (await f.request('GET', '/dashboard/resumen')).data;
  const e = (await f.request('POST', '/equipos', { nombre: 'Portátil de prueba', tipo: 'laptop', estado: 'activo', sedeId: 's1' })).data;
  assert.equal(e.sede.nombre, 'Sede principal');
  const failure = (await f.request('POST', '/fallas', { equipoId: e.id, titulo: 'No enciende', descripcion: 'El equipo no inicia', categoria: 'hardware', prioridad: 'alta' })).data;
  const maintenance = (await f.request('POST', '/mantenimientos', { equipoId: e.id, fallaId: failure.id, responsableId: 'u2', titulo: 'Revisión de encendido', tipo: 'correctivo', fechaProgramada: '2099-10-20', costo: 25000 })).data;
  assert.ok(maintenance.id);
  await f.request('PATCH', `/mantenimientos/${maintenance.id}/estado`, { estado: 'en_proceso' });
  assert.equal((await f.request('GET', `/equipos/${e.id}`)).data.estado, 'en_mantenimiento');
  await f.request('PATCH', `/mantenimientos/${maintenance.id}/estado`, { estado: 'completado' });
  await f.request('PATCH', `/fallas/${failure.id}/estado`, { estado: 'resuelta' });
  const summary = (await f.request('GET', '/dashboard/resumen')).data;
  assert.equal(summary.totalEquipos, baseline.totalEquipos + 1);
  assert.equal(summary.fallasPendientes, baseline.fallasPendientes);
  assert.equal(summary.mantenimientosCompletadosMes, baseline.mantenimientosCompletadosMes + 1);
  assert.equal(summary.costoMes, baseline.costoMes + 25000);
  assert.ok((await f.request('GET', `/equipos/${e.id}/historial`)).data.length >= 5);
  await f.restart(); await f.login();
  assert.equal((await f.request('GET', `/equipos/${e.id}`)).data.estado, 'activo');
  assert.equal((await f.request('GET', `/mantenimientos/${maintenance.id}`)).data.estado, 'completado');
  assert.equal((await f.request('GET', '/mantenimientos?estado=vencido')).data.length, 1);
});

test('HTTP: validation, filtering, archive/restore, unknown endpoints and roles', async t => {
  const f = await fixture(t); await f.login();
  assert.equal((await f.request('POST', '/equipos', { nombre: '' })).status, 400);
  assert.equal((await f.request('POST', '/mantenimientos', { equipoId: 'e1', fallaId: 'f2', responsableId: 'u2', titulo: 'Prueba', tipo: 'correctivo', fechaProgramada: '2099-01-01' })).status, 400);
  assert.equal((await f.request('GET', '/equipos?search=PVX-001')).data.length, 1);
  assert.equal((await f.request('GET', '/fallas?search=ventilador&categoria=hardware')).data.length, 1);
  await f.request('PATCH', '/equipos/e1/archivar', {});
  assert.equal((await f.request('GET', '/equipos')).data.length, 4);
  assert.equal((await f.request('GET', '/equipos?estado=archivado')).data[0].id, 'e1');
  await f.request('PUT', '/equipos/e1', { estado: 'activo' });
  assert.equal((await f.request('GET', '/equipos')).data.length, 5);
  assert.equal((await f.request('GET', '/dashboard/unknown')).status, 404);
  assert.equal((await f.request('POST', '/auth/demo', {})).status, 404);
  const user = await f.request('POST', '/usuarios/invitar', { nombre: 'Consulta', email: 'consulta@example.com', password: 'Consulta1234', rol: 'consulta' });
  assert.equal(user.status, 200);
  assert.ok(!(await readFile(f.file, 'utf8')).includes('Consulta1234'));
  await f.login('consulta@example.com', 'Consulta1234');
  assert.equal((await f.request('GET', '/equipos')).status, 200);
  assert.equal((await f.request('POST', '/equipos', { nombre: 'Sin permiso', tipo: 'desktop' })).status, 403);
});

test('HTTP: concurrent writes, profile, locations, settings and notification state', async t => {
  const f = await fixture(t); await f.login();
  await Promise.all(Array.from({ length: 5 }, (_, i) => f.request('POST', '/equipos', { nombre: `Concurrente ${i}`, tipo: 'desktop' })));
  assert.equal((await f.request('GET', '/equipos')).data.length, 10);
  await f.request('PUT', '/empresa', { nombre: 'Empresa de clase', emailContacto: 'clase@example.com' });
  assert.equal((await f.request('GET', '/empresa')).data.nombre, 'Empresa de clase');
  await f.request('POST', '/sedes/s1/ubicaciones', { nombre: 'Laboratorio' });
  assert.equal((await f.request('GET', '/sedes')).data[0].ubicaciones.length, 2);
  await f.request('PATCH', '/notificaciones/leer-todas', {});
  assert.ok((await f.request('GET', '/notificaciones')).data.every(n => n.leida));
  assert.equal((await f.request('PUT', '/auth/perfil', { nombre: 'Laura', passwordActual: 'wrong', password: 'Nueva1234' })).status, 400);
  assert.equal((await f.request('PUT', '/auth/perfil', { nombre: 'Laura Clase', passwordActual: 'Demo1234', password: 'Nueva1234' })).status, 200);
  assert.equal((await f.login('demo@preventix.com', 'Demo1234')).status, 401);
  assert.equal((await f.login('demo@preventix.com', 'Nueva1234')).data.usuario.nombre, 'Laura Clase');
});
