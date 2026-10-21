import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';
import { z } from 'zod';
import { createError } from '../../middlewares/error.middleware';

const router = Router();
router.use(authenticate);

const fallaSchema = z.object({
  equipoId: z.string().uuid(),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().min(1),
  categoria: z.enum(['hardware', 'software', 'red', 'perifericos', 'otro']).default('otro'),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  asignadoA: z.string().uuid().optional(),
});

// GET /fallas
router.get('/', async (req, res, next) => {
  try {
    const { equipoId, estado, prioridad, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = { empresaId: req.user!.empresaId };
    if (equipoId) where['equipoId'] = equipoId;
    if (estado) where['estado'] = estado;
    if (prioridad) where['prioridad'] = prioridad;

    const [fallas, total] = await Promise.all([
      prisma.falla.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          equipo: { select: { id: true, nombre: true } },
          reportador: { select: { id: true, nombre: true } },
          tecnico: { select: { id: true, nombre: true } },
        },
      }),
      prisma.falla.count({ where }),
    ]);

    res.json({ success: true, data: fallas, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// POST /fallas
router.post('/', requireRole('administrador', 'responsable', 'tecnico'), async (req, res, next) => {
  try {
    const data = fallaSchema.parse(req.body);
    const equipo = await prisma.equipo.findFirst({ where: { id: data.equipoId, empresaId: req.user!.empresaId } });
    if (!equipo) return next(createError('Equipo no encontrado', 404));

    const falla = await prisma.falla.create({
      data: { ...data, empresaId: req.user!.empresaId, reportadoPor: req.user!.userId },
    });

    // Actualizar estado del equipo
    await prisma.equipo.update({ where: { id: data.equipoId }, data: { estado: 'en_mantenimiento' } });

    // Historial
    await prisma.historialEquipo.create({
      data: { equipoId: data.equipoId, usuarioId: req.user!.userId, tipoEvento: 'falla', descripcion: `Falla reportada: "${data.titulo}"` },
    });

    res.status(201).json({ success: true, data: falla });
  } catch (err) { next(err); }
});

// GET /fallas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const falla = await prisma.falla.findFirst({
      where: { id: req.params.id, empresaId: req.user!.empresaId },
      include: {
        equipo: true,
        reportador: { select: { id: true, nombre: true } },
        tecnico: { select: { id: true, nombre: true } },
        mantenimientos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!falla) return next(createError('Falla no encontrada', 404));
    res.json({ success: true, data: falla });
  } catch (err) { next(err); }
});

// PUT /fallas/:id
router.put('/:id', requireRole('administrador', 'responsable', 'tecnico'), async (req, res, next) => {
  try {
    const falla = await prisma.falla.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!falla) return next(createError('Falla no encontrada', 404));

    const updated = await prisma.falla.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// PATCH /fallas/:id/estado
router.patch('/:id/estado', requireRole('administrador', 'responsable', 'tecnico'), async (req, res, next) => {
  try {
    const { estado, diagnostico, solucionAplicada } = req.body;
    const falla = await prisma.falla.findFirst({ where: { id: req.params.id, empresaId: req.user!.empresaId } });
    if (!falla) return next(createError('Falla no encontrada', 404));

    const updateData: Record<string, unknown> = { estado };
    if (diagnostico) updateData['diagnostico'] = diagnostico;
    if (solucionAplicada) updateData['solucionAplicada'] = solucionAplicada;
    if (estado === 'resuelta' || estado === 'cerrada') updateData['fechaResolucion'] = new Date();

    const updated = await prisma.falla.update({ where: { id: req.params.id }, data: updateData });

    // Si se resuelve, volver equipo a activo
    if (estado === 'resuelta' || estado === 'cerrada') {
      await prisma.equipo.update({ where: { id: falla.equipoId }, data: { estado: 'activo' } });
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
