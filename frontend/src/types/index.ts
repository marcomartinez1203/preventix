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
  sugerenciaMantenimiento?: { recomendado: boolean; frecuenciaDias: number; fechaProgramada: string; diasHastaRevision: number; pendiente: { id: string } | null } | null;
  garantiaVencimiento?: string;
  contratoSoporte?: string;
  contratoVencimiento?: string;
  cobertura?: { garantia: Cobertura; contrato: Cobertura };
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

export interface Cobertura {
  fecha: string | null;
  diasRestantes: number | null;
  estado: 'sin_registrar' | 'vigente' | 'por_vencer' | 'vencida';
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
  presupuestoMes?: {
    periodo: string; moneda: string; limite: number; gasto: number;
    saldo: number | null; porcentaje: number | null;
    estado: 'sin_configurar' | 'normal' | 'alerta' | 'excedido';
  };
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

export interface MtbfEquipo {
  equipoId: string;
  nombre: string;
  tipo: TipoEquipo;
  mtbfDias: number;
  totalFallas: number;
  clasificacion: 'excelente' | 'bueno' | 'regular' | 'critico';
}
export interface RiesgoEquipo { equipoId: string; nombre: string; scoreRiesgo: number | null; nivelRiesgo: "alto" | "medio" | "bajo" | "sin_datos"; factores: { nombre: string; detalle: string; puntos: number | null; maximo: number }[]; calculadoEn: string; }
export interface SaludEquipos {
  indice: number | null;
  estado: 'sin_equipos' | 'favorable' | 'atencion' | 'prioritario';
  totalEquipos: number;
  equiposConFallas: number;
  equiposSinPreventivoReciente: number;
  factores: { nombre: string; cantidad: number; total: number; peso: number; puntos: number | null }[];
  tendencias: { mes: string; reportadas: number; resueltas: number; costo: number }[];
  moneda: string;
  calculadoEn: string;
}
export interface PeriodoPresupuesto {
  periodo: string; gasto: number; limite: number; saldo: number | null; porcentaje: number | null;
  estado: 'sin_configurar' | 'normal' | 'alerta' | 'excedido';
}
export interface ReportePresupuesto {
  moneda: string;
  mes: PeriodoPresupuesto;
  meses: (PeriodoPresupuesto & { historialDisponible: boolean })[];
  anual: PeriodoPresupuesto & { proyeccion: number | null; mesesCerrados: number };
}
