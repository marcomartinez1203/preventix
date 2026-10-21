import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { createError } from '../../middlewares/error.middleware';
import { RegisterInput, LoginInput } from './auth.schema';

const generateTokens = (payload: object) => {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
};

export const register = async (input: RegisterInput) => {
  const { empresa: empresaData, admin: adminData } = input;

  // Verificar email único
  const existingUser = await prisma.usuario.findUnique({
    where: { email: adminData.email },
  });
  if (existingUser) throw createError('Este email ya está registrado', 409);

  // Obtener plan esencial por defecto
  const planEsencial = await prisma.plan.findFirst({
    where: { nombre: 'Esencial', activo: true },
  });
  if (!planEsencial) throw createError('Plan no disponible', 500);

  const passwordHash = await bcrypt.hash(adminData.password, 12);

  const empresa = await prisma.empresa.create({
    data: {
      nombre: empresaData.nombre,
      nit: empresaData.nit,
      emailContacto: empresaData.emailContacto,
      telefono: empresaData.telefono,
      planId: planEsencial.id,
      configuracion: {
        create: {
          notifEmail: true,
          diasAvisoMantenimiento: 7,
        },
      },
      sedes: {
        create: {
          nombre: 'Sede Principal',
          activa: true,
        },
      },
      usuarios: {
        create: {
          nombre: adminData.nombre,
          email: adminData.email,
          passwordHash,
          rol: 'administrador',
          activo: true,
        },
      },
    },
    include: {
      usuarios: { select: { id: true, email: true, rol: true } },
    },
  });

  const usuario = empresa.usuarios[0];
  const { accessToken, refreshToken } = generateTokens({
    userId: usuario.id,
    empresaId: empresa.id,
    rol: usuario.rol,
    esTecnicoExterno: false,
  });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken, ultimoAcceso: new Date() },
  });

  return { accessToken, refreshToken, usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol }, empresa: { id: empresa.id, nombre: empresa.nombre } };
};

export const login = async (input: LoginInput) => {
  const usuario = await prisma.usuario.findUnique({
    where: { email: input.email },
    include: { empresa: { select: { id: true, nombre: true, activa: true } } },
  });

  if (!usuario || !usuario.activo) throw createError('Credenciales inválidas', 401);
  if (!usuario.empresa.activa) throw createError('Empresa inactiva, contacta a soporte', 403);

  const passwordValida = await bcrypt.compare(input.password, usuario.passwordHash);
  if (!passwordValida) throw createError('Credenciales inválidas', 401);

  // Para técnico externo, buscar empresa activa donde esté autorizado (puede ser diferente a su empresa principal)
  const { accessToken, refreshToken } = generateTokens({
    userId: usuario.id,
    empresaId: usuario.empresaId,
    rol: usuario.rol,
    esTecnicoExterno: usuario.esTecnicoExterno,
  });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken, ultimoAcceso: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      esTecnicoExterno: usuario.esTecnicoExterno,
    },
    empresa: usuario.empresa,
  };
};

export const refreshAccessToken = async (token: string) => {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret) as jwt.JwtPayload;
  } catch {
    throw createError('Refresh token inválido o expirado', 401);
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: payload['userId'], refreshToken: token, activo: true },
  });
  if (!usuario) throw createError('Refresh token revocado', 401);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    userId: usuario.id,
    empresaId: usuario.empresaId,
    rol: usuario.rol,
    esTecnicoExterno: usuario.esTecnicoExterno,
  });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken: newRefreshToken },
  });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId: string) => {
  await prisma.usuario.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};
