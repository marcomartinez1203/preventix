import { Router } from 'express';
import * as equiposController from './equipos.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { checkPlanLimiteEquipos } from '../../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);

router.get('/', equiposController.listar);
router.get('/:id', equiposController.obtener);
router.get('/:id/historial', equiposController.historial);

router.post(
  '/',
  requireRole('administrador', 'responsable'),
  checkPlanLimiteEquipos,
  equiposController.crear
);
router.put(
  '/:id',
  requireRole('administrador', 'responsable'),
  equiposController.actualizar
);
router.patch(
  '/:id/archivar',
  requireRole('administrador', 'responsable'),
  equiposController.archivar
);
router.patch(
  '/:id/estado',
  requireRole('administrador', 'responsable'),
  equiposController.cambiarEstado
);

export default router;
