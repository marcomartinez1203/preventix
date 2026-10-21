import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';
import { z } from 'zod';
import { createError } from '../../middlewares/error.middleware';

const router = Router();
router.use(authenticate);

// GET /empresa
router.get('/', async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user!.empresaId },
      include: { plan: true, configuracion: true },
    });
    res.json({ success: true, data: empresa });
  } catch (err) { next(err); }
});

// PUT /empresa
router.put('/', requireRole('administrador'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().max(150).optional(),
      nit: z.string().max(30).optional(),
      emailContacto: z.string().email().optional(),
      telefono: z.string().max(20).optional(),
    });
    const data = schema.parse(req.body);
    const empresa = await prisma.empresa.update({ where: { id: req.user!.empresaId }, data });
    res.json({ success: true, data: empresa });
  } catch (err) { next(err); }
});

// GET /empresa/configuracion
router.get('/configuracion', async (req, res, next) => {
  try {
    const config = await prisma.configuracionEmpresa.findUnique({ where: { empresaId: req.user!.empresaId } });
    if (!config) return next(createError('Configuración no encontrada', 404));
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// PUT /empresa/configuracion
router.put('/configuracion', requireRole('administrador'), async (req, res, next) => {
  try {
    const schema = z.object({
      notifEmail: z.boolean().optional(),
      diasAvisoMantenimiento: z.number().int().min(1).max(30).optional(),
      zonaHoraria: z.string().optional(),
      moneda: z.string().max(10).optional(),
    });
    const data = schema.parse(req.body);
    const config = await prisma.configuracionEmpresa.update({ where: { empresaId: req.user!.empresaId }, data });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

export default router;
