import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/database';

const router = Router();
router.use(authenticate);

// GET /dashboard/resumen
router.get('/resumen', async (req, res, next) => {
  try {
    const empresaId = req.user!.empresaId;
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(hoy.getDate() + 30);

    const [
      totalEquipos,
      equiposActivos,
      equiposEnMantenimiento,
      fallaAbiertas,
      fallasEnProceso,
      mantenimientosProximos,
      mantenimientosVencidos,
      empresa,
    ] = await Promise.all([
      prisma.equipo.count({ where: { empresaId, archivado: false } }),
      prisma.equipo.count({ where: { empresaId, estado: 'activo', archivado: false } }),
      prisma.equipo.count({ where: { empresaId, estado: 'en_mantenimiento', archivado: false } }),
      prisma.falla.count({ where: { empresaId, estado: 'abierta' } }),
      prisma.falla.count({ where: { empresaId, estado: 'en_proceso' } }),
      prisma.mantenimiento.count({
        where: { empresaId, estado: 'programado', fechaProgramada: { gte: hoy, lte: en30dias } },
      }),
      prisma.mantenimiento.count({
        where: { empresaId, estado: 'programado', fechaProgramada: { lt: hoy } },
      }),
      prisma.empresa.findUnique({
        where: { id: empresaId },
        include: { plan: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        inventario: { total: totalEquipos, activos: equiposActivos, enMantenimiento: equiposEnMantenimiento, limiteplan: empresa?.plan.maxEquipos },
        fallas: { abiertas: fallaAbiertas, enProceso: fallasEnProceso },
        mantenimientos: { proximos: mantenimientosProximos, vencidos: mantenimientosVencidos },
        plan: empresa?.plan,
      },
    });
  } catch (err) { next(err); }
});

// GET /dashboard/mantenimientos-proximos
router.get('/mantenimientos-proximos', async (req, res, next) => {
  try {
    const empresaId = req.user!.empresaId;
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const mantenimientos = await prisma.mantenimiento.findMany({
      where: {
        empresaId,
        estado: 'programado',
        fechaProgramada: { gte: new Date(), lte: en30dias },
      },
      orderBy: { fechaProgramada: 'asc' },
      take: 10,
      include: {
        equipo: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
      },
    });
    res.json({ success: true, data: mantenimientos });
  } catch (err) { next(err); }
});

// GET /dashboard/equipos-recurrentes
router.get('/equipos-recurrentes', async (req, res, next) => {
  try {
    const empresaId = req.user!.empresaId;
    const equipos = await prisma.equipo.findMany({
      where: { empresaId, archivado: false },
      include: { _count: { select: { fallas: true } } },
      orderBy: { fallas: { _count: 'desc' } },
      take: 5,
    });
    res.json({ success: true, data: equipos });
  } catch (err) { next(err); }
});

export default router;
