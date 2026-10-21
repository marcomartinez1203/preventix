import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
const crypto = { randomUUID };

type Row = { id: string; [key: string]: unknown };
type Collection = 'equipos' | 'fallas' | 'mantenimientos' | 'usuarios' | 'sedes' | 'notificaciones' | 'historial';
type Database = Record<Collection, Row[]> & { empresa: Row; configuracion: Row; passwords: Record<string, string> };
const now = () => new Date().toISOString();
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const text = (value: unknown) => String(value ?? '');
export class DemoError extends Error { constructor(message: string, public status = 400) { super(message); } }
const fail = (message: string): never => { throw new DemoError(message); };
const find = (rows: Row[], id: unknown) => rows.find(r => r.id === id);
const required = (rows: Row[], id: unknown) => find(rows, id) ?? fail('El registro ya no existe.');
const hash = (value: string) => bcrypt.hash(value, 10);

function seed(): Database {
  const usuarios: Row[] = [
    { id: 'u1', nombre: 'Laura Martínez', email: 'demo@preventix.com', rol: 'administrador', activo: true, esTecnicoExterno: false, createdAt: day(-60), ultimoAcceso: now() },
    { id: 'u2', nombre: 'Andrés Gómez', email: 'tecnico@preventix.com', rol: 'tecnico', activo: true, esTecnicoExterno: false, createdAt: day(-30) },
  ];
  const equipos = ['Recepción', 'Diseño', 'Contabilidad', 'Servidor principal', 'Sala de reuniones'].map((nombre, i) => ({
    id: `e${i + 1}`, nombre, tipo: i === 3 ? 'servidor' : i % 2 ? 'laptop' : 'desktop', marca: i % 2 ? 'Lenovo' : 'Dell', modelo: i === 3 ? 'PowerEdge' : 'Pro', numeroSerie: `PVX-00${i + 1}`, procesador: 'Intel Core i7', ramGb: 16, almacenamientoGb: 512, sistemaOperativo: i === 3 ? 'Linux' : 'Windows 11', fechaAdquisicion: day(-180), estado: 'activo', archivado: false, sedeId: 's1', responsableId: 'u2', usuarioAsignadoId: 'u1', createdAt: day(-60), updatedAt: day(-1),
  }));
  return {
    usuarios, equipos,
    empresa: { id: 'empresa-demo', nombre: 'Empresa Demo', nit: '900123456-7', emailContacto: 'demo@preventix.com', telefono: '3001234567' },
    configuracion: { id: 'config', notifEmail: false, diasAvisoMantenimiento: 3, zonaHoraria: 'America/Bogota', moneda: 'COP' },
    sedes: [{ id: 's1', nombre: 'Sede principal', ciudad: 'Bogotá', direccion: 'Carrera 15 # 93-60', ubicaciones: [{ id: 'ub1', nombre: 'Oficina principal' }] }],
    fallas: [
      { id: 'f1', equipoId: 'e1', titulo: 'Equipo lento al iniciar', descripcion: 'El inicio tarda más de cinco minutos.', categoria: 'software', prioridad: 'media', estado: 'abierta', reportadorId: 'u1', asignadoA: 'u2', fechaReporte: day(-3), createdAt: day(-3) },
      { id: 'f2', equipoId: 'e2', titulo: 'Temperatura elevada', descripcion: 'El ventilador permanece encendido.', categoria: 'hardware', prioridad: 'alta', estado: 'en_proceso', reportadorId: 'u1', asignadoA: 'u2', fechaReporte: day(-2), createdAt: day(-2) },
      { id: 'f3', equipoId: 'e3', titulo: 'Conexión intermitente', descripcion: 'Se reemplazó el cable de red.', categoria: 'red', prioridad: 'baja', estado: 'resuelta', solucionAplicada: 'Cambio de cable Ethernet.', reportadorId: 'u1', asignadoA: 'u2', fechaReporte: day(-7), fechaResolucion: day(-1), createdAt: day(-7) },
    ],
    mantenimientos: [
      { id: 'm1', equipoId: 'e2', responsableId: 'u2', fallaId: 'f2', titulo: 'Limpieza y revisión térmica', tipo: 'correctivo', estado: 'programado', fechaProgramada: day(2), actividades: 'Limpiar ventiladores y revisar pasta térmica.', costo: 85000, createdAt: day(-1) },
      { id: 'm2', equipoId: 'e4', responsableId: 'u2', titulo: 'Revisión del servidor', tipo: 'preventivo', estado: 'programado', fechaProgramada: day(-2), costo: 120000, createdAt: day(-8) },
      { id: 'm3', equipoId: 'e3', responsableId: 'u2', titulo: 'Revisión de conectividad', tipo: 'correctivo', estado: 'completado', fechaProgramada: day(-1), fechaFin: day(-1), costo: 35000, createdAt: day(-7) },
    ],
    notificaciones: [{ id: 'n1', tipo: 'mantenimiento', titulo: 'Mantenimiento próximo', mensaje: 'Limpieza y revisión térmica está programada para dentro de dos días.', leida: false, createdAt: now() }],
    historial: equipos.map(e => ({ id: `h-${e.id}`, equipoId: e.id, tipoEvento: 'registro', descripcion: 'Equipo registrado en el inventario demo', createdAt: day(-60), usuario: usuarios[0] })),
    passwords: {},
  };
}

function hydrate(db: Database, kind: string, row: Row): Row {
  if (kind === 'equipos') return { ...row, sede: find(db.sedes, row.sedeId), responsable: find(db.usuarios, row.responsableId), usuarioAsignado: find(db.usuarios, row.usuarioAsignadoId) };
  if (kind === 'fallas') return { ...row, equipo: find(db.equipos, row.equipoId), tecnico: find(db.usuarios, row.asignadoA), reportador: find(db.usuarios, row.reportadorId) };
  if (kind === 'mantenimientos') return { ...row, equipo: find(db.equipos, row.equipoId), responsable: find(db.usuarios, row.responsableId), falla: find(db.fallas, row.fallaId) };
  return row;
}

export interface DemoRequest {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  actorId?: string;
}

export function createDemoStore(filePath: string) {
  async function save(db: Database) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath + '.tmp', JSON.stringify(db, null, 2), 'utf8');
    await rename(filePath + '.tmp', filePath);
  }
  async function read(): Promise<Database> {
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8')) as Database;
      if (!data.equipos || !data.usuarios || !data.passwords) throw new Error('Formato inválido');
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new DemoError('No se pudo leer el archivo de datos del servidor.', 500);
      const db = seed();
      db.passwords.u1 = await hash('Demo1234');
      await save(db);
      return db;
    }
  }
  async function execute(input: DemoRequest) {
    const db = await read();
    const method = input.method.toLowerCase();
    const [kind, id, action] = input.url.split('/').filter(Boolean);
    const body = input.body ?? {};
    const params = input.params ?? {};
    const actor = find(db.usuarios, input.actorId ?? 'u1');
    if (!actor || !actor.activo) throw new DemoError('Usuario no autorizado.', 401);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    db.mantenimientos.forEach(m => { if (m.estado === 'programado' && new Date(text(m.fechaProgramada)) < today) m.estado = 'vencido'; });
    let result: unknown;
    const session = (usuario: Row) => ({ usuario, empresa: db.empresa });
    const history = (equipoId: unknown, descripcion: string) => db.historial.unshift({ id: crypto.randomUUID(), equipoId, descripcion, tipoEvento: kind, usuario: { id: actor.id, nombre: actor.nombre }, createdAt: now() });

    if (kind === 'auth') {
      if (id === 'login') {
        const user = db.usuarios.find(u => text(u.email).toLowerCase() === text(body.email).toLowerCase());
        if (!user || !user.activo) throw new DemoError('Correo o contraseña incorrectos.', 401);
        const expected = db.passwords[user!.id] ?? '';
        if (!await bcrypt.compare(text(body.password), expected)) throw new DemoError('Correo o contraseña incorrectos.', 401);
        user!.ultimoAcceso = now(); result = session(user!);
      } else if (id === 'perfil') {
        if (body.password) {
          const expected = db.passwords[actor.id] ?? '';
          if (!await bcrypt.compare(text(body.passwordActual), expected)) fail('La contraseña actual no coincide.');
          if (text(body.password).length < 8) fail('La contraseña debe tener al menos 8 caracteres.');
          db.passwords[actor.id] = await hash(text(body.password));
        }
        actor.nombre = text(body.nombre).trim(); result = session(actor);
      } else if (id === 'me' || id === 'refresh') result = session(actor);
      else if (id === 'logout') result = {};
      else fail('Acción no disponible.');
    } else if (kind === 'empresa') {
      const row = id === 'configuracion' ? db.configuracion : db.empresa;
      if (method !== 'get') Object.assign(row, body);
      result = row;
    } else if (kind === 'dashboard') {
      const active = db.equipos.filter(e => !e.archivado);
      const pending = db.mantenimientos.filter(m => m.estado === 'programado');
      const completed = db.mantenimientos.filter(m => m.estado === 'completado' && text(m.fechaFin).slice(0, 7) === now().slice(0, 7));
      if (id === 'resumen') result = { totalEquipos: active.length, equiposActivos: active.filter(e => e.estado === 'activo').length, equiposEnMantenimiento: active.filter(e => e.estado === 'en_mantenimiento').length, fallasPendientes: db.fallas.filter(f => ['abierta', 'en_proceso'].includes(text(f.estado))).length, mantenimientosProximos: pending.length, mantenimientosVencidos: db.mantenimientos.filter(m => m.estado === 'vencido').length, mantenimientosCompletadosMes: completed.length, costoMes: completed.reduce((sum, m) => sum + Number(m.costo ?? 0), 0) };
      else if (id === 'mantenimientos-proximos') result = pending.sort((a, b) => text(a.fechaProgramada).localeCompare(text(b.fechaProgramada))).map(m => hydrate(db, 'mantenimientos', m));
      else result = active.map(e => ({ equipoId: e.id, nombre: e.nombre, totalFallas: db.fallas.filter(f => f.equipoId === e.id).length })).filter(e => e.totalFallas > 0).sort((a, b) => b.totalFallas - a.totalFallas);
    } else {
      const collections: Collection[] = ['equipos', 'fallas', 'mantenimientos', 'usuarios', 'sedes', 'notificaciones'];
      if (!collections.includes(kind as Collection)) fail('Ruta no disponible en la demo.');
      const rows = db[kind as Collection];
      if (kind === 'equipos' && action === 'historial') result = db.historial.filter(h => h.equipoId === id);
      else if (kind === 'notificaciones' && id === 'leer-todas') { rows.forEach(n => { n.leida = true; }); result = {}; }
      else if (kind === 'sedes' && action === 'ubicaciones') {
        const sede = required(rows, id);
        const ubicaciones = (sede.ubicaciones ?? []) as Row[];
        if (method === 'post') ubicaciones.push({ ...body, id: crypto.randomUUID() });
        sede.ubicaciones = ubicaciones; result = ubicaciones;
      } else if (method === 'get') {
        if (id) result = hydrate(db, kind, required(rows, id));
        else result = rows.filter(row => {
          if (kind === 'equipos' && row.archivado && params.estado !== 'archivado') return false;
          return Object.entries(params).every(([key, value]) => {
            if (!value || ['page', 'limit'].includes(key)) return true;
            if (key === 'search') return [row.nombre, row.numeroSerie, row.titulo, row.descripcion, find(db.equipos, row.equipoId)?.nombre].some(v => text(v).toLowerCase().includes(value.toLowerCase()));
            return text(row[key]) === value;
          });
        }).map(row => hydrate(db, kind, row));
      } else {
        const creating = method === 'post';
        if (['fallas', 'mantenimientos'].includes(kind) && (creating || 'equipoId' in body)) {
          const equipo = required(db.equipos, body.equipoId);
          if (equipo.archivado) fail('Selecciona un equipo activo en el inventario.');
        }
        if (kind === 'mantenimientos' && (creating || 'responsableId' in body)) required(db.usuarios, body.responsableId);
        if (kind === 'mantenimientos' && body.fallaId && required(db.fallas, body.fallaId).equipoId !== (body.equipoId ?? find(rows, id)?.equipoId)) fail('La falla debe pertenecer al equipo seleccionado.');
        if (kind === 'usuarios' && creating && rows.some(u => text(u.email).toLowerCase() === text(body.email).toLowerCase())) fail('Este correo ya está registrado.');
        const row: Row = creating ? { id: crypto.randomUUID(), createdAt: now(), estado: kind === 'fallas' ? 'abierta' : kind === 'mantenimientos' ? 'programado' : 'activo', archivado: false, activo: true, esTecnicoExterno: false, reportadorId: actor.id, fechaReporte: now() } : required(rows, id);
        if (kind === 'usuarios' && !creating && row.id === actor.id && ((body.rol && body.rol !== actor.rol) || body.activo === false)) fail('No puedes desactivar tu usuario ni cambiar tu propio rol.');
        const { password, ...safeBody } = body;
        Object.assign(row, safeBody, { updatedAt: now() });
        for (const field of ['fechaProgramada', 'fechaAdquisicion']) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(text(row[field]))) row[field] = new Date(`${text(row[field])}T12:00:00`).toISOString();
        }
        if (kind === 'usuarios' && password) db.passwords[row.id] = await hash(text(password));
        if (action === 'archivar') { row.archivado = true; row.estado = 'archivado'; }
        if (kind === 'equipos') { row.archivado = row.estado === 'archivado'; history(row.id, creating ? 'Equipo registrado' : `Equipo actualizado: ${text(row.estado).replace(/_/g, ' ')}`); }
        if (kind === 'fallas') {
          row.fechaResolucion = ['resuelta', 'cerrada'].includes(text(row.estado)) ? row.fechaResolucion ?? now() : undefined;
          history(row.equipoId, `Falla: ${text(row.titulo)} · ${text(row.estado).replace(/_/g, ' ')}`);
        }
        if (kind === 'mantenimientos') {
          if (row.estado === 'en_proceso') row.fechaInicio ??= now();
          row.fechaFin = row.estado === 'completado' ? row.fechaFin ?? now() : undefined;
          if (row.estado === 'programado' && new Date(text(row.fechaProgramada)) < today) row.estado = 'vencido';
          history(row.equipoId, `Mantenimiento: ${text(row.titulo)} · ${text(row.estado).replace(/_/g, ' ')}`);
          db.notificaciones.unshift({ id: crypto.randomUUID(), titulo: creating ? 'Mantenimiento programado' : 'Mantenimiento actualizado', mensaje: text(row.titulo), leida: false, createdAt: now() });
        }
        if (kind === 'notificaciones') row.leida = true;
        if (creating) rows.unshift(row);
        if (kind === 'mantenimientos') {
          const equipo = required(db.equipos, row.equipoId);
          const inProgress = rows.some(m => m.equipoId === equipo.id && m.estado === 'en_proceso');
          if (!equipo.archivado && equipo.estado !== 'fuera_servicio') {
            if (inProgress) equipo.estado = 'en_mantenimiento';
            else if (equipo.estado === 'en_mantenimiento') equipo.estado = 'activo';
          }
        }
        result = hydrate(db, kind, row);
      }
    }

    await save(db);
    return result;
  }
  // Serialize transactions so concurrent HTTP requests cannot overwrite each other.
  let queue: Promise<unknown> = Promise.resolve();
  return {
    execute(input: DemoRequest): Promise<unknown> {
      const result = queue.then(() => execute(input));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
