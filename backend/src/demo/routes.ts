import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createDemoStore, DemoError, type Database } from './store';
import type { JsonPersistence } from './persistence';
import { StorageConflictError } from './persistence';

const nonempty = z.string().trim().min(1);
const date = z.string().refine(v => Number.isFinite(Date.parse(v)), 'Fecha inválida');
const roles = z.enum(['administrador', 'responsable', 'tecnico', 'consulta']);
const schemas = {
  equipos: z.object({ nombre: nonempty, tipo: z.enum(['desktop', 'laptop', 'servidor', 'otro']), estado: z.enum(['activo', 'en_mantenimiento', 'fuera_servicio', 'archivado']).default('activo'), marca: z.string().optional(), modelo: z.string().optional(), numeroSerie: z.string().optional(), procesador: z.string().optional(), ramGb: z.number().int().positive().optional(), almacenamientoGb: z.number().int().positive().optional(), sistemaOperativo: z.string().optional(), fechaAdquisicion: z.union([date, z.literal('')]).optional(), sedeId: z.string().optional(), responsableId: z.string().optional(), usuarioAsignadoId: z.string().optional(), notas: z.string().optional() }),
  fallas: z.object({ equipoId: nonempty, titulo: nonempty, descripcion: nonempty, categoria: z.enum(['hardware', 'software', 'red', 'perifericos', 'otro']), prioridad: z.enum(['baja', 'media', 'alta', 'critica']), asignadoA: z.string().optional(), diagnostico: z.string().optional(), solucionAplicada: z.string().optional() }),
  mantenimientos: z.object({ equipoId: nonempty, responsableId: nonempty, titulo: nonempty, tipo: z.enum(['preventivo', 'correctivo']), fechaProgramada: date, costo: z.number().min(0).optional(), fallaId: z.string().optional(), actividades: z.string().optional(), observaciones: z.string().optional() }),
  usuarios: z.object({ nombre: nonempty, email: z.string().email(), password: z.string().min(8), rol: roles }),
  sedes: z.object({ nombre: nonempty, ciudad: z.string().optional(), direccion: z.string().optional() }),
};
type SessionData = { usuario: { id: string; rol: string; activo: boolean; [key: string]: unknown }; empresa: unknown };

export function createDemoRouter(source: string | JsonPersistence<Database>, secret: string, secureCookies = false) {
  const router = Router();
  const store = createDemoStore(source);
  const cookieName = 'preventixDemoRefresh';
  const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax' as const, path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 };
  const sign = (userId: string, sid: string, kind: 'access' | 'refresh') => jwt.sign({ sub: userId, sid, kind }, secret, { algorithm: 'HS256', issuer: 'preventix-demo', expiresIn: kind === 'access' ? '15m' : '7d' });
  const verify = async (token: string | undefined, kind: string) => {
    try {
      const payload = jwt.verify(token ?? '', secret, { algorithms: ['HS256'], issuer: 'preventix-demo' }) as jwt.JwtPayload;
      if (typeof payload.sid !== 'string' || typeof payload.sub !== 'string') throw new Error();
      const entry = await store.session('get', payload.sid);
      if (payload.kind !== kind || !entry || entry.userId !== payload.sub || entry.expires < Date.now()) throw new Error();
      return { userId: entry.userId, sid: payload.sid as string };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || (error instanceof Error && !error.message)) throw new DemoError('Sesión inválida o expirada.', 401);
      throw error;
    }
  };

  router.use(async (req, res) => {
    try {
      const [kind, id, action, extra] = req.path.split('/').filter(Boolean);
      const method = req.method.toLowerCase();
      const execute = (body: Record<string, unknown>, actorId?: string) => store.execute({ url: req.path, method, body, actorId, params: Object.fromEntries(Object.entries(req.query).filter((pair): pair is [string, string] => typeof pair[1] === 'string')) });

      if (req.path === '/auth/login' && method === 'post') {
        const body = z.object({ email: z.string().email(), password: nonempty }).parse(req.body);
        const result = await execute(body) as SessionData;
        const sid = randomUUID();
        await store.session('create', sid, result.usuario.id);
        res.cookie(cookieName, sign(result.usuario.id, sid, 'refresh'), cookieOptions);
        res.json({ data: { ...result, accessToken: sign(result.usuario.id, sid, 'access') } });
        return;
      }
      if (req.path === '/auth/refresh' && method === 'post') {
        const session = await verify(req.cookies?.[cookieName], 'refresh');
        await store.execute({ url: '/auth/me', method: 'get', actorId: session.userId });
        res.json({ data: { accessToken: sign(session.userId, session.sid, 'access') } });
        return;
      }
      if (req.path === '/auth/logout' && method === 'post') {
        try { const session = await verify(req.cookies?.[cookieName], 'refresh'); await store.session('delete', session.sid); }
        catch (error) { if (!(error instanceof DemoError && error.status === 401)) throw error; }
        res.clearCookie(cookieName, { path: cookieOptions.path, secure: secureCookies, sameSite: 'lax', httpOnly: true });
        res.json({ data: {} }); return;
      }
      const session = await verify(req.headers.authorization?.replace(/^Bearer /, ''), 'access');
      const current = await store.execute({ url: '/auth/me', method: 'get', actorId: session.userId }) as SessionData;
      if (extra) throw new DemoError('Ruta no encontrada.', 404);
      if (method !== 'get') {
        const allowed = ['usuarios', 'sedes', 'empresa'].includes(kind) ? ['administrador'] : kind === 'equipos' ? ['administrador', 'responsable'] : ['administrador', 'responsable', 'tecnico'];
        if (!['auth', 'notificaciones'].includes(kind) && !allowed.includes(current.usuario.rol)) throw new DemoError('Sin permisos para esta acción.', 403);
      }
      let body: Record<string, unknown> = {};
      let valid = false;
      if (kind === 'auth' && !action) {
        if (id === 'me' && method === 'get') { res.json({ data: current }); return; }
        if (id === 'perfil' && method === 'put') {
          body = z.object({ nombre: nonempty, passwordActual: z.string().optional(), password: z.union([z.string().min(8), z.literal('')]).optional() }).parse(req.body);
          const result = await execute(body, session.userId) as SessionData;
          res.json({ data: { ...result, accessToken: sign(session.userId, session.sid, 'access') } }); return;
        }
      } else if (kind === 'dashboard') {
        valid = method === 'get' && !action && ['resumen', 'mantenimientos-proximos', 'equipos-recurrentes', 'mtbf'].includes(id);
      } else if (kind === 'empresa' && !action && (!id || id === 'configuracion')) {
        valid = ['get', 'put'].includes(method);
        if (method === 'put') body = id === 'configuracion'
          ? z.object({ notifEmail: z.boolean(), diasAvisoMantenimiento: z.number().int().min(1).max(30), zonaHoraria: nonempty, moneda: z.enum(['COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS']) }).parse(req.body)
          : z.object({ nombre: nonempty, nit: z.string().optional(), emailContacto: z.string().email(), telefono: z.string().optional() }).parse(req.body);
      } else if (kind === 'notificaciones') {
        valid = (method === 'get' && !id) || (method === 'patch' && ((id === 'leer-todas' && !action) || (!!id && action === 'leer')));
      } else if (Object.prototype.hasOwnProperty.call(schemas, kind)) {
        const schema = schemas[kind as keyof typeof schemas];
        if (method === 'get' && !action) valid = true;
        else if (method === 'post' && !action && (!id || (kind === 'usuarios' && id === 'invitar'))) { body = schema.parse(req.body); valid = true; }
        else if (method === 'put' && id && !action) {
          body = kind === 'usuarios' ? z.object({ nombre: nonempty, rol: roles, activo: z.boolean() }).parse(req.body) : schema.partial().parse(req.body); valid = true;
        } else if (method === 'patch' && id && action === 'estado' && ['equipos', 'fallas', 'mantenimientos'].includes(kind)) {
          const states = kind === 'equipos' ? ['activo', 'en_mantenimiento', 'fuera_servicio', 'archivado'] : kind === 'fallas' ? ['abierta', 'en_proceso', 'resuelta', 'cerrada'] : ['programado', 'en_proceso', 'completado', 'cancelado', 'vencido'];
          body = z.object({ estado: z.string().refine(v => states.includes(v), 'Estado inválido') }).parse(req.body); valid = true;
        } else if (kind === 'equipos' && id && ((action === 'historial' && method === 'get') || (action === 'archivar' && method === 'patch'))) valid = true;
        else if (kind === 'sedes' && id && action === 'ubicaciones' && ['get', 'post'].includes(method)) {
          if (method === 'post') body = z.object({ nombre: nonempty, descripcion: z.string().optional() }).parse(req.body);
          valid = true;
        }
      }
      if (!valid) throw new DemoError('Ruta no encontrada.', 404);
      const result = await execute(body, session.userId);
      res.json({ data: result });
    } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ message: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }); return; }
      if (error instanceof DemoError) { res.status(error.status).json({ message: error.message }); return; }
      if (error instanceof StorageConflictError) { res.status(409).json({ message: error.message }); return; }
      console.error('Error en API de sustentación:', error);
      res.status(500).json({ message: 'No se pudo completar la operación en el servidor.' });
    }
  });
  return router;
}
