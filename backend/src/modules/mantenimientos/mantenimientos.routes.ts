import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';
import { z } from 'zod';
import { createError } from '../../middlewares/error.middleware';

const router = Router();
router.use(authenticate);

const mantenimientoSchema = z.object({
  equipoId: z.string().uuid(),
  fallaId: z.string().uuid().optional(),
  responsableId: z.string().uuid(),
  tipo: z.enum(['preventivo', 'correctivo']).default('preventivo'),
  titulo: z.string().min(1).max(200),
  actividades: z.string().optional(),
  observaciones: z.string().optional(),
  costo: z.number().positive().optional(),
  fechaProgramada: z.string().datetime(),
});

// GET /mantenimientos
router.get('/', async (req, res, next) => {
  try {
    const { equipoId, estado, tipo, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = { empresaId: req.user!.empresaId };
    if (equipoId) where['equipoId'] = equipoId;
    if (estado) where['estado'] = estado;
    if (tipo) where['tipo'] = tipo;

    const [mantenimientos, total] = await Promise.all([
      prisma.mantenimiento.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { fechaProgramada: 'asc' },
        include: {
          equipo: { select: { id: true, nombre: true } },
          responsable: { select: { id: true, nombre: true } },
          falla: { select: { id: true, titulo: true } },
        },
      }),
      prisma.mantenimiento.count({ where }),
    ]);

    res.json({ success: true, data: mantenimientos, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// POST /mantenimientos
router.post('/', requireRole('administrador', 'responsable'), async (req, res, next) => {
  try {
    const data = mantenimientoSchema.parse(req.body);
    const equipo = await prisma.equipo.findFirst({ where: { id: data.equipoId, empresaId: req.user!.empresaId } });
    if (!equipo) return next(createError('Equipo no encontrado', 404));

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        ...data,
        empresaId: req.user!.empresaId,
        fechaProgramada: new Date(data.fechaProgramada),
        costo: data.costo ? data.costo : undefined,
      },
    });

    // Registrar historial del equipo
    await prisma.historialEquipo.create({
      data: {
        equipoId: data.equipoId,
        usuarioId: req.user!.userId,
        tipoEvento: 'mantenimiento',
        descripcion: `Mantenimiento ${data.tipo} programado: "${data.titulo}"`,
      },
    });

    res.status(201).json({ success: true, data: mantenimiento });
  } catch (err) { next(err); }
});

// GET /mantenimientos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const mantenimiento = await prisma.mantenimiento.findFirst({
      where: { id: req.params.id, empresaId: req.user!.empresaId },
      include: {
        equipo: true,
        responsable: { select: { id: true, nombre: true } },
        falla: true,
        alertas: true,
      },
    });
    if (!mantenimiento) return next(createError('Mantenimiento no encontrado', 404));
    res.json({ success: true, data: mantenimiento });
  } catch (err) { next(err); }
});

// PUT /mantenimientos/:id
router.put('/:id', requireRole('administrador', 'responsable'), async (req, res, next) => {
  try {
    const mant = await prisma.mantenimiento.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!mant) return next(createError('Mantenimiento no encontrado', 404));

    const updated = await prisma.mantenimiento.update({
      where: { id: req.params.id },
      data: { ...req.body, fechaProgramada: req.body.fechaProgramada ? new Date(req.body.fechaProgramada) : undefined },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// PATCH /mantenimientos/:id/estado
router.patch('/:id/estado', requireRole('administrador', 'responsable', 'tecnico'), async (req, res, next) => {
  try {
    const { estado, observaciones, fechaFin } = req.body;
    const mant = await prisma.mantenimiento.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!mant) return next(createError('Mantenimiento no encontrado', 404));

    const updateData: Record<string, unknown> = { estado };
    if (observaciones) updateData['observaciones'] = observaciones;
    if (estado === 'en_proceso') updateData['fechaInicio'] = new Date();
    if (estado === 'completado') updateData['fechaFin'] = fechaFin ? new Date(fechaFin) : new Date();

    const updated = await prisma.mantenimiento.update({ where: { id: req.params.id }, data: updateData });

    // Historial
    await prisma.historialEquipo.create({
      data: {
        equipoId: mant.equipoId,
        usuarioId: req.user!.userId,
        tipoEvento: 'mantenimiento',
        descripcion: `Mantenimiento "${mant.titulo}" - estado: ${estado}`,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
