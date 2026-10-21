import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from './error.middleware';

/**
 * Verifica que el técnico externo tenga acceso a la empresa del request.
 * Para usuarios internos, no hace nada adicional.
 */
export const tenantGuard = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(createError('No autenticado', 401));

    const { userId, empresaId, esTecnicoExterno } = req.user;

    if (esTecnicoExterno) {
      // Verificar que esté autorizado para esta empresa
      const autorizacion = await prisma.tecnicoEmpresa.findFirst({
        where: { tecnicoId: userId, empresaId, activo: true },
      });
      if (!autorizacion) {
        return next(createError('Técnico no autorizado en esta empresa', 403));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Valida que la empresa no haya superado su límite de equipos antes de crear uno nuevo.
 */
export const checkPlanLimiteEquipos = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(createError('No autenticado', 401));

    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.empresaId },
      include: { plan: true },
    });
    if (!empresa) return next(createError('Empresa no encontrada', 404));

    const totalEquipos = await prisma.equipo.count({
      where: { empresaId: req.user.empresaId, archivado: false },
    });

    if (totalEquipos >= empresa.plan.maxEquipos) {
      return next(
        createError(
          `Límite del plan "${empresa.plan.nombre}" alcanzado (${empresa.plan.maxEquipos} equipos). Actualiza tu suscripción.`,
          403
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Valida que la empresa no haya superado su límite de sedes.
 */
export const checkPlanLimiteSedes = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(createError('No autenticado', 401));

    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.empresaId },
      include: { plan: true },
    });
    if (!empresa) return next(createError('Empresa no encontrada', 404));

    const totalSedes = await prisma.sede.count({
      where: { empresaId: req.user.empresaId, activa: true },
    });

    if (totalSedes >= empresa.plan.maxSedes) {
      return next(
        createError(
          `Límite de sedes del plan "${empresa.plan.nombre}" alcanzado (${empresa.plan.maxSedes} sede/s).`,
          403
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
