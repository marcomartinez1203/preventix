import { Request, Response, NextFunction } from 'express';
import * as equiposService from './equipos.service';
import { crearEquipoSchema, actualizarEquipoSchema, filtrosEquipoSchema } from './equipos.schema';

export const listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = filtrosEquipoSchema.parse({ query: req.query });
    const result = await equiposService.listarEquipos(req.user!.empresaId, query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const obtener = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const equipo = await equiposService.obtenerEquipo(req.params.id, req.user!.empresaId);
    res.json({ success: true, data: equipo });
  } catch (err) { next(err); }
};

export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { body } = crearEquipoSchema.parse({ body: req.body });
    const equipo = await equiposService.crearEquipo(req.user!.empresaId, req.user!.userId, body);
    res.status(201).json({ success: true, data: equipo });
  } catch (err) { next(err); }
};

export const actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { body } = actualizarEquipoSchema.parse({ body: req.body });
    const equipo = await equiposService.actualizarEquipo(req.params.id, req.user!.empresaId, req.user!.userId, body);
    res.json({ success: true, data: equipo });
  } catch (err) { next(err); }
};

export const archivar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await equiposService.archivarEquipo(req.params.id, req.user!.empresaId, req.user!.userId);
    res.json({ success: true, message: 'Equipo archivado' });
  } catch (err) { next(err); }
};

export const cambiarEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const equipo = await equiposService.cambiarEstado(req.params.id, req.user!.empresaId, req.user!.userId, req.body.estado);
    res.json({ success: true, data: equipo });
  } catch (err) { next(err); }
};

export const historial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await equiposService.obtenerHistorial(req.params.id, req.user!.empresaId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
