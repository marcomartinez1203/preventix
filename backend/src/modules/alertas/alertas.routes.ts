import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';

const router = Router();
router.use(authenticate);

// GET /notificaciones
router.get('/', async (req, res, next) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId: req.user!.userId, empresaId: req.user!.empresaId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const noLeidas = notificaciones.filter((n: { leida: boolean }) => !n.leida).length;
    res.json({ success: true, data: notificaciones, noLeidas });
  } catch (err) { next(err); }
});

// PATCH /notificaciones/:id/leer
router.patch('/:id/leer', async (req, res, next) => {
  try {
    await prisma.notificacion.updateMany({
      where: { id: req.params.id, usuarioId: req.user!.userId },
      data: { leida: true },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /notificaciones/leer-todas
router.patch('/leer-todas', async (req, res, next) => {
  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.user!.userId, empresaId: req.user!.empresaId, leida: false },
      data: { leida: true },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
