import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { checkPlanLimiteSedes } from '../../middlewares/tenant.middleware';
import { prisma } from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const sedeSchema = z.object({
  nombre: z.string().min(1).max(100),
  direccion: z.string().optional(),
  ciudad: z.string().max(100).optional(),
});

const ubicacionSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional(),
});

// GET /sedes
router.get('/', async (req, res, next) => {
  try {
    const sedes = await prisma.sede.findMany({
      where: { empresaId: req.user!.empresaId },
      include: { ubicaciones: true, _count: { select: { equipos: true } } },
      orderBy: { nombre: 'asc' },
    });
    res.json({ success: true, data: sedes });
  } catch (err) { next(err); }
});

// POST /sedes
router.post('/', requireRole('administrador'), checkPlanLimiteSedes, async (req, res, next) => {
  try {
    const data = sedeSchema.parse(req.body);
    const sede = await prisma.sede.create({ data: { ...data, empresaId: req.user!.empresaId } });
    res.status(201).json({ success: true, data: sede });
  } catch (err) { next(err); }
});

// PUT /sedes/:id
router.put('/:id', requireRole('administrador'), async (req, res, next) => {
  try {
    const sede = await prisma.sede.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!sede) return next(createError('Sede no encontrada', 404));
    const data = sedeSchema.partial().parse(req.body);
    const updated = await prisma.sede.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /sedes/:id
router.delete('/:id', requireRole('administrador'), async (req, res, next) => {
  try {
    const sede = await prisma.sede.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!sede) return next(createError('Sede no encontrada', 404));
    await prisma.sede.update({ where: { id: req.params.id }, data: { activa: false } });
    res.json({ success: true, message: 'Sede desactivada' });
  } catch (err) { next(err); }
});

// GET /sedes/:id/ubicaciones
router.get('/:id/ubicaciones', async (req, res, next) => {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      where: { sedeId: req.params.id },
      orderBy: { nombre: 'asc' },
    });
    res.json({ success: true, data: ubicaciones });
  } catch (err) { next(err); }
});

// POST /sedes/:id/ubicaciones
router.post('/:id/ubicaciones', requireRole('administrador'), async (req, res, next) => {
  try {
    const sede = await prisma.sede.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!sede) return next(createError('Sede no encontrada', 404));
    const data = ubicacionSchema.parse(req.body);
    const ubicacion = await prisma.ubicacion.create({ data: { ...data, sedeId: req.params.id } });
    res.status(201).json({ success: true, data: ubicacion });
  } catch (err) { next(err); }
});

export default router;
