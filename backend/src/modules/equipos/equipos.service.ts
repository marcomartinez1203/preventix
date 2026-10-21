import { prisma } from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { CrearEquipoInput, FiltrosEquipo } from './equipos.schema';

export const listarEquipos = async (empresaId: string, filtros: FiltrosEquipo) => {
  const page = parseInt(filtros.page || '1');
  const limit = parseInt(filtros.limit || '20');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    empresaId,
    archivado: filtros.archivado === 'true',
  };

  if (filtros.sedeId) where['sedeId'] = filtros.sedeId;
  if (filtros.estado) where['estado'] = filtros.estado;
  if (filtros.tipo) where['tipo'] = filtros.tipo;
  if (filtros.busqueda) {
    where['OR'] = [
      { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
      { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
      { modelo: { contains: filtros.busqueda, mode: 'insensitive' } },
      { numeroSerie: { contains: filtros.busqueda, mode: 'insensitive' } },
    ];
  }

  const [equipos, total] = await Promise.all([
    prisma.equipo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sede: { select: { id: true, nombre: true } },
        ubicacion: { select: { id: true, nombre: true } },
        usuarioAsignado: { select: { id: true, nombre: true, email: true } },
        responsable: { select: { id: true, nombre: true } },
        _count: { select: { fallas: true, mantenimientos: true } },
      },
    }),
    prisma.equipo.count({ where }),
  ]);

  return {
    data: equipos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const obtenerEquipo = async (id: string, empresaId: string) => {
  const equipo = await prisma.equipo.findFirst({
    where: { id, empresaId },
    include: {
      sede: true,
      ubicacion: true,
      usuarioAsignado: { select: { id: true, nombre: true, email: true } },
      responsable: { select: { id: true, nombre: true } },
      _count: { select: { fallas: true, mantenimientos: true } },
    },
  });
  if (!equipo) throw createError('Equipo no encontrado', 404);
  return equipo;
};

export const crearEquipo = async (empresaId: string, usuarioId: string, data: CrearEquipoInput) => {
  const equipo = await prisma.equipo.create({
    data: {
      ...data,
      empresaId,
      fechaAdquisicion: data.fechaAdquisicion ? new Date(data.fechaAdquisicion) : undefined,
    },
  });

  // Registrar en historial
  await prisma.historialEquipo.create({
    data: {
      equipoId: equipo.id,
      usuarioId,
      tipoEvento: 'creacion',
      descripcion: `Equipo "${equipo.nombre}" registrado en el inventario`,
    },
  });

  return equipo;
};

export const actualizarEquipo = async (
  id: string,
  empresaId: string,
  usuarioId: string,
  data: Partial<CrearEquipoInput>
) => {
  const equipo = await prisma.equipo.findFirst({ where: { id, empresaId } });
  if (!equipo) throw createError('Equipo no encontrado', 404);

  const equipoActualizado = await prisma.equipo.update({
    where: { id },
    data: {
      ...data,
      fechaAdquisicion: data.fechaAdquisicion ? new Date(data.fechaAdquisicion) : undefined,
    },
  });

  await prisma.historialEquipo.create({
    data: {
      equipoId: id,
      usuarioId,
      tipoEvento: 'edicion',
      descripcion: `Equipo actualizado`,
      metadata: { cambios: data },
    },
  });

  return equipoActualizado;
};

export const archivarEquipo = async (id: string, empresaId: string, usuarioId: string) => {
  const equipo = await prisma.equipo.findFirst({ where: { id, empresaId } });
  if (!equipo) throw createError('Equipo no encontrado', 404);

  await prisma.equipo.update({
    where: { id },
    data: { archivado: true, estado: 'archivado' },
  });

  await prisma.historialEquipo.create({
    data: {
      equipoId: id,
      usuarioId,
      tipoEvento: 'archivado',
      descripcion: `Equipo archivado (historial conservado)`,
    },
  });
};

export const cambiarEstado = async (
  id: string,
  empresaId: string,
  usuarioId: string,
  estado: string
) => {
  const equipo = await prisma.equipo.findFirst({ where: { id, empresaId } });
  if (!equipo) throw createError('Equipo no encontrado', 404);

  const equipoActualizado = await prisma.equipo.update({
    where: { id },
    data: { estado: estado as never },
  });

  await prisma.historialEquipo.create({
    data: {
      equipoId: id,
      usuarioId,
      tipoEvento: 'cambio_estado',
      descripcion: `Estado cambiado de "${equipo.estado}" a "${estado}"`,
    },
  });

  return equipoActualizado;
};

export const obtenerHistorial = async (id: string, empresaId: string) => {
  const equipo = await prisma.equipo.findFirst({ where: { id, empresaId } });
  if (!equipo) throw createError('Equipo no encontrado', 404);

  return prisma.historialEquipo.findMany({
    where: { equipoId: id },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
};
