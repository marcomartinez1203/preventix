// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type Rol = 'administrador' | 'responsable' | 'tecnico' | 'consulta';
export type TipoEquipo = 'desktop' | 'laptop' | 'servidor' | 'otro';
export type EstadoEquipo = 'activo' | 'en_mantenimiento' | 'fuera_servicio' | 'archivado';
export type CategoriaFalla = 'hardware' | 'software' | 'red' | 'perifericos' | 'otro';
export type PrioridadFalla = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoFalla = 'abierta' | 'en_proceso' | 'resuelta' | 'cerrada';
export type TipoMantenimiento = 'preventivo' | 'correctivo';
export type EstadoMantenimiento = 'programado' | 'en_proceso' | 'completado' | 'cancelado' | 'vencido';

// ─────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────

export interface UsuarioResumen {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  esTecnicoExterno: boolean;
  activo: boolean;
  ultimoAcceso?: string;
  createdAt: string;
}

export interface SedeResumen {
  id: string;
  nombre: string;
  ciudad?: string;
}

export interface UbicacionResumen {
  id: string;
  nombre: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  tipo: TipoEquipo;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  procesador?: string;
  ramGb?: number;
  almacenamientoGb?: number;
  sistemaOperativo?: string;
  fechaAdquisicion?: string;
  estado: EstadoEquipo;
  imagenUrl?: string;
  notas?: string;
  archivado: boolean;
  createdAt: string;
  updatedAt: string;
  sede?: SedeResumen;
  ubicacion?: UbicacionResumen;
  usuarioAsignado?: UsuarioResumen;
  responsable?: UsuarioResumen;
}

export interface HistorialEquipoItem {
  id: string;
  tipoEvento: string;
  descripcion: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  usuario: { id: string; nombre: string };
}

export interface Falla {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaFalla;
  prioridad: PrioridadFalla;
  estado: EstadoFalla;
  diagnostico?: string;
  solucionAplicada?: string;
  fechaReporte: string;
  fechaResolucion?: string;
  createdAt: string;
  equipo: Pick<Equipo, 'id' | 'nombre' | 'tipo'>;
  reportador: Pick<UsuarioResumen, 'id' | 'nombre'>;
  tecnico?: Pick<UsuarioResumen, 'id' | 'nombre'>;
}

export interface Mantenimiento {
  id: string;
  titulo: string;
  tipo: TipoMantenimiento;
  estado: EstadoMantenimiento;
  actividades?: string;
  observaciones?: string;
  costo?: number;
  fechaProgramada: string;
  fechaInicio?: string;
  fechaFin?: string;
  createdAt: string;
  equipo: Pick<Equipo, 'id' | 'nombre' | 'tipo'>;
  responsable: Pick<UsuarioResumen, 'id' | 'nombre'>;
  falla?: Pick<Falla, 'id' | 'titulo'>;
}

export interface DashboardResumen {
  totalEquipos: number;
  equiposActivos: number;
  equiposEnMantenimiento: number;
  fallasPendientes: number;
  mantenimientosProximos: number;
  mantenimientosVencidos: number;
  mantenimientosCompletadosMes: number;
  costoMes?: number;
}

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  referenciaId?: string;
  referenciaTipo?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
