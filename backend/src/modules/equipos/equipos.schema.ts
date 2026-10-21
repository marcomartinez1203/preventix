import { z } from 'zod';

export const crearEquipoSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(150),
    tipo: z.enum(['desktop', 'laptop', 'servidor', 'otro']).default('desktop'),
    marca: z.string().max(100).optional(),
    modelo: z.string().max(100).optional(),
    numeroSerie: z.string().max(100).optional(),
    procesador: z.string().max(150).optional(),
    ramGb: z.number().int().positive().optional(),
    almacenamientoGb: z.number().int().positive().optional(),
    sistemaOperativo: z.string().max(100).optional(),
    fechaAdquisicion: z.string().datetime().optional(),
    sedeId: z.string().uuid().optional(),
    ubicacionId: z.string().uuid().optional(),
    usuarioAsignadoId: z.string().uuid().optional(),
    responsableId: z.string().uuid().optional(),
    notas: z.string().optional(),
  }),
});

export const actualizarEquipoSchema = z.object({ body: crearEquipoSchema.shape.body.partial() });

export const filtrosEquipoSchema = z.object({
  query: z.object({
    sedeId: z.string().uuid().optional(),
    estado: z.enum(['activo', 'en_mantenimiento', 'fuera_servicio', 'archivado']).optional(),
    tipo: z.enum(['desktop', 'laptop', 'servidor', 'otro']).optional(),
    archivado: z.string().optional(),
    busqueda: z.string().optional(),
    page: z.string().default('1'),
    limit: z.string().default('20'),
  }),
});

export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>['body'];
export type FiltrosEquipo = z.infer<typeof filtrosEquipoSchema>['query'];
