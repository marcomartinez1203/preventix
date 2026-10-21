import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /usuarios
router.get('/', requireRole('administrador', 'responsable'), async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: req.user!.empresaId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, ultimoAcceso: true, createdAt: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ success: true, data: usuarios });
  } catch (err) { next(err); }
});

// GET /usuarios/:id
router.get('/:id', requireRole('administrador'), async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id: req.params.id, empresaId: req.user!.empresaId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    });
    if (!usuario) return next(createError('Usuario no encontrado', 404));
    res.json({ success: true, data: usuario });
  } catch (err) { next(err); }
});

// POST /usuarios/invitar
router.post('/invitar', requireRole('administrador'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(1).max(100),
      email: z.string().email(),
      rol: z.enum(['responsable', 'tecnico', 'consulta']),
      password: z.string().min(8),
    });
    const data = schema.parse(req.body);

    const existe = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (existe) return next(createError('Este email ya está registrado', 409));

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 12);

    const usuario = await prisma.usuario.create({
      data: { ...data, passwordHash, empresaId: req.user!.empresaId },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    res.status(201).json({ success: true, data: usuario });
  } catch (err) { next(err); }
});

// PUT /usuarios/:id
router.put('/:id', requireRole('administrador'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().max(100).optional(),
      rol: z.enum(['responsable', 'tecnico', 'consulta']).optional(),
      activo: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const usuario = await prisma.usuario.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!usuario) return next(createError('Usuario no encontrado', 404));

    const updated = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// POST /usuarios/tecnicos-externos
router.post('/tecnicos-externos', requireRole('administrador'), async (req, res, next) => {
  try {
    const schema = z.object({ tecnicoId: z.string().uuid() });
    const { tecnicoId } = schema.parse(req.body);

    const tecnico = await prisma.usuario.findFirst({ where: { id: tecnicoId, esTecnicoExterno: true, activo: true } });
    if (!tecnico) return next(createError('Técnico externo no encontrado', 404));

    const autorizacion = await prisma.tecnicoEmpresa.upsert({
      where: { tecnicoId_empresaId: { tecnicoId, empresaId: req.user!.empresaId } },
      update: { activo: true },
      create: { tecnicoId, empresaId: req.user!.empresaId, autorizadoPor: req.user!.userId },
    });
    res.status(201).json({ success: true, data: autorizacion });
  } catch (err) { next(err); }
});

export default router;
