import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { body } = registerSchema.parse({ body: req.body });
    const result = await authService.register(body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.status(201).json({
      success: true,
      message: 'Empresa registrada exitosamente',
      data: { accessToken: result.accessToken, usuario: result.usuario, empresa: result.empresa },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { body } = loginSchema.parse({ body: req.body });
    const result = await authService.login(body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: result.accessToken, usuario: result.usuario, empresa: result.empresa },
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token requerido' });
      return;
    }

    const result = await authService.refreshAccessToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) await authService.logout(req.user.userId);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};
