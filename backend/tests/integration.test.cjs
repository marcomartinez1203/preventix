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

test('HTTP: suggested preventive persists and concurrent acceptance cannot duplicate it', async t => {
  const f = await fixture(t);
  await f.login();
  const equipment = (await f.request('POST', '/equipos', { nombre: 'Equipo de planificación', tipo: 'desktop', fechaAdquisicion: '2025-01-01' })).data;
  const suggestion = await f.request('GET', `/equipos/${equipment.id}/sugerencia-mantenimiento`);
  assert.equal(suggestion.status, 200);
  assert.equal(suggestion.data.frecuenciaDias, 30);
  assert.equal(suggestion.data.pendiente, null);
  const body = { equipoId: equipment.id, responsableId: 'u2', tipo: 'preventivo', titulo: 'Preventivo sugerido', fechaProgramada: '2099-10-20', sugerido: true };
  assert.equal((await f.request('POST', '/mantenimientos', { ...body, fechaProgramada: '2020-01-01' })).status, 400);
  const responses = await Promise.all([f.request('POST', '/mantenimientos', body), f.request('POST', '/mantenimientos', body)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const record = responses.find(r => r.status === 200).data;
  const next = await f.request('GET', `/equipos/${equipment.id}/sugerencia-mantenimiento`);
  assert.equal(next.data.pendiente.id, record.id);
  assert.ok((await f.request('GET', `/equipos/${equipment.id}/historial`)).data.some(h => h.descripcion.includes('Preventivo sugerido')));
  await f.restart(); await f.login();
  assert.equal((await f.request('GET', `/mantenimientos/${record.id}`)).data.tipo, 'preventivo');
  await f.request('PATCH', `/mantenimientos/${record.id}/estado`, { estado: 'cancelado' });
  assert.equal((await f.request('POST', '/mantenimientos', body)).status, 200);
  await f.request('PATCH', `/equipos/${equipment.id}/archivar`, {});
  assert.equal((await f.request('GET', `/equipos/${equipment.id}/sugerencia-mantenimiento`)).status, 400);
});

test('HTTP: monthly budget validates, persists and counts only completed costs', async t => {
  const f = await fixture(t); await f.login();
  const config = (await f.request('GET', '/empresa/configuracion')).data;
  const setBudget = value => f.request('PUT', '/empresa/configuracion', { ...config, presupuestoMensualMantenimiento: value });
  assert.equal((await setBudget(-1)).status, 400);
  assert.equal((await setBudget(1.001)).status, 400);
  assert.equal((await setBudget(100000)).status, 200);
  const before = (await f.request('GET', '/dashboard/resumen')).data;
  assert.equal(before.presupuestoMes.limite, 100000);
  const task = (await f.request('POST', '/mantenimientos', { equipoId: 'e1', responsableId: 'u2', titulo: 'Costo para presupuesto', tipo: 'correctivo', fechaProgramada: '2099-10-20', costo: 100000 })).data;
  assert.equal((await f.request('GET', '/dashboard/resumen')).data.costoMes, before.costoMes);
  await f.request('PATCH', `/mantenimientos/${task.id}/estado`, { estado: 'completado' });
  const after = (await f.request('GET', '/dashboard/resumen')).data;
  assert.equal(after.costoMes, before.costoMes + 100000);
  assert.equal(after.presupuestoMes.gasto, after.costoMes);
  assert.equal(after.presupuestoMes.saldo, 100000 - after.costoMes);
  await f.restart(); await f.login();
  assert.equal((await f.request('GET', '/empresa/configuracion')).data.presupuestoMensualMantenimiento, 100000);
  await setBudget(0);
  assert.equal((await f.request('GET', '/dashboard/resumen')).data.presupuestoMes.estado, 'sin_configurar');
});

test('HTTP: equipment risk updates after failures and excludes archived equipment', async t => {
  const f = await fixture(t); await f.login();
  const e = (await f.request('POST', '/equipos', { nombre: 'Riesgo demo', tipo: 'desktop', fechaAdquisicion: '2020-01-01' })).data;
  const before = (await f.request('GET', '/dashboard/riesgo-equipos')).data.find(r => r.equipoId === e.id);
  await f.request('POST', '/fallas', { equipoId: e.id, titulo: 'Falla grave', descripcion: 'No arranca', categoria: 'hardware', prioridad: 'critica' });
  const after = (await f.request('GET', '/dashboard/riesgo-equipos')).data.find(r => r.equipoId === e.id);
  assert.ok(after.scoreRiesgo > before.scoreRiesgo);
  assert.equal(after.factores.length, 4);
  await f.request('PATCH', `/equipos/${e.id}/archivar`, {});
  assert.equal((await f.request('GET', '/dashboard/riesgo-equipos')).data.some(r => r.equipoId === e.id), false);
});

test('HTTP: fleet health reflects preventive completion, failure resolution and reconciles monthly cost', async t => {
  const f = await fixture(t); await f.login();
  const before = (await f.request('GET', '/dashboard/salud-parque')).data;
  const e = (await f.request('POST', '/equipos', { nombre: 'Equipo para estado general', tipo: 'desktop' })).data;
  const failure = (await f.request('POST', '/fallas', { equipoId: e.id, titulo: 'Prueba de estado', descripcion: 'Incidencia de prueba', categoria: 'hardware', prioridad: 'media' })).data;
  const affected = (await f.request('GET', '/dashboard/salud-parque')).data;
  assert.equal(affected.totalEquipos, before.totalEquipos + 1);
  assert.equal(affected.equiposConFallas, before.equiposConFallas + 1);
  const task = (await f.request('POST', '/mantenimientos', { equipoId: e.id, responsableId: 'u2', titulo: 'Revisión para estado general', tipo: 'preventivo', fechaProgramada: '2099-10-20', costo: 123.45 })).data;
  await f.request('PATCH', `/mantenimientos/${task.id}/estado`, { estado: 'completado' });
  await f.request('PATCH', `/fallas/${failure.id}/estado`, { estado: 'resuelta' });
  const after = (await f.request('GET', '/dashboard/salud-parque')).data;
  assert.equal(after.factores[2].cantidad, before.factores[2].cantidad + 1);
  assert.equal(after.equiposConFallas, before.equiposConFallas);
  assert.equal(after.tendencias.length, 6);
  assert.equal(after.tendencias[5].costo, (await f.request('GET', '/dashboard/resumen')).data.costoMes);
  assert.ok(after.indice > affected.indice);
});

test('HTTP: coverage dates, provider, filters, notices, renewal and persistence', async t => {
  const f = await fixture(t); await f.login();
  const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const payload = { nombre: 'Garantía prueba', tipo: 'desktop', garantiaVencimiento: date, contratoSoporte: 'Soporte Aula', contratoVencimiento: date };
  assert.equal((await f.request('POST', '/equipos', { ...payload, garantiaVencimiento: '2026-02-31' })).status, 400);
  assert.equal((await f.request('POST', '/equipos', { ...payload, contratoSoporte: '' })).status, 400);
  const e = (await f.request('POST', '/equipos', payload)).data;
  assert.equal(e.cobertura.garantia.estado, 'por_vencer');
  assert.ok((await f.request('GET', '/equipos?cobertura=contratos_por_vencer')).data.some(row => row.id === e.id));
  const alerts = (await f.request('GET', '/notificaciones')).data.filter(n => n.referenciaId === e.id);
  assert.equal(alerts.length, 2);
  assert.equal((await f.request('GET', '/notificaciones')).data.filter(n => n.referenciaId === e.id).length, 2);
  await f.restart(); await f.login();
  assert.equal((await f.request('GET', `/equipos/${e.id}`)).data.contratoSoporte, 'Soporte Aula');
  await f.request('PUT', `/equipos/${e.id}`, { garantiaVencimiento: '', contratoSoporte: '', contratoVencimiento: '' });
  const cleared = (await f.request('GET', `/equipos/${e.id}`)).data;
  assert.equal(cleared.cobertura.contrato.estado, 'sin_registrar');
  assert.ok((await f.request('GET', '/notificaciones')).data.filter(n => n.referenciaId === e.id).every(n => n.leida));
});

test('HTTP: annual budget, persistent alerts and inventory recommendation are connected', async t => {
  const f = await fixture(t); await f.login();
  const config = (await f.request('GET', '/empresa/configuracion')).data;
  assert.equal((await f.request('PUT', '/empresa/configuracion', { ...config, presupuestoAnualMantenimiento: -1 })).status, 400);
  assert.equal((await f.request('PUT', '/empresa/configuracion', { ...config, presupuestoMensualMantenimiento: 100, presupuestoAnualMantenimiento: 100 })).status, 200);
  const e = (await f.request('POST', '/equipos', { nombre: 'Preventivo recomendado', tipo: 'desktop', fechaAdquisicion: '2020-01-01' })).data;
  assert.equal(e.sugerenciaMantenimiento.recomendado, true);
  const task = (await f.request('POST', '/mantenimientos', { equipoId: e.id, responsableId: 'u2', titulo: 'Revisión sugerida', tipo: 'preventivo', fechaProgramada: '2099-10-20', costo: 101 })).data;
  assert.equal((await f.request('GET', `/equipos/${e.id}`)).data.sugerenciaMantenimiento.recomendado, false);
  await f.request('PATCH', `/mantenimientos/${task.id}/estado`, { estado: 'completado' });
  const report = (await f.request('GET', '/dashboard/presupuesto')).data;
  assert.equal(report.anual.limite, 100);
  assert.equal(report.anual.estado, 'excedido');
  assert.equal(report.mes.gasto, (await f.request('GET', '/dashboard/resumen')).data.costoMes);
  const notices = (await f.request('GET', '/notificaciones')).data.filter(n => n.tipo === 'presupuesto');
  assert.ok(notices.some(n => n.titulo === 'Presupuesto anual superado'));
  await f.restart(); await f.login();
  assert.deepEqual((await f.request('GET', '/notificaciones')).data.filter(n => n.tipo === 'presupuesto').map(n => n.id), notices.map(n => n.id));
  assert.equal((await f.request('GET', '/dashboard/presupuesto')).data.anual.gasto, report.anual.gasto);
});
