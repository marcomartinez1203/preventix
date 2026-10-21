import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    empresa: z.object({
      nombre: z.string().min(2, 'Nombre de empresa requerido').max(150),
      nit: z.string().optional(),
      emailContacto: z.string().email('Email inválido'),
      telefono: z.string().optional(),
    }),
    admin: z.object({
      nombre: z.string().min(2, 'Nombre requerido').max(100),
      email: z.string().email('Email inválido'),
      password: z
        .string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número'),
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Contraseña requerida'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
