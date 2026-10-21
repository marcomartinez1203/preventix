import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface JwtPayload {
  userId: string;
  empresaId: string;
  rol: string;
  esTecnicoExterno: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token requerido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verificar que el usuario sigue activo
    const usuario = await prisma.usuario.findFirst({
      where: { id: payload.userId, activo: true },
      select: { id: true, empresaId: true, rol: true, esTecnicoExterno: true },
    });

    if (!usuario) {
      res.status(401).json({ success: false, message: 'Usuario no autorizado' });
      return;
    }

    req.user = {
      userId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      esTecnicoExterno: usuario.esTecnicoExterno,
    };

    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ success: false, message: 'Sin permisos suficientes' });
      return;
    }
    next();
  };
};
