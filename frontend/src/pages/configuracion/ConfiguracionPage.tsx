import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Settings2, MapPin, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { empresaApi, sedesApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Schemas ──────────────────────────────────────
const empresaSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().optional(),
  emailContacto: z.string().email('Email inválido'),
  telefono: z.string().optional(),
});
const configSchema = z.object({
  notifEmail: z.boolean(),
  diasAvisoMantenimiento: z.coerce.number().int().min(1).max(30),
  zonaHoraria: z.string(),
  moneda: z.string(),
});
const sedeSchema = z.object({
  nombre: z.string().min(2),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
});
const ubicacionSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
});

type EmpresaForm = z.infer<typeof empresaSchema>;
type ConfigForm = z.infer<typeof configSchema>;
type SedeForm = z.infer<typeof sedeSchema>;
type UbicacionForm = z.infer<typeof ubicacionSchema>;

// ─── Tab Empresa ─────────────────────────────────
function TabEmpresa() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: empresa } = useQuery({
    queryKey: ['empresa'],
    queryFn: () => empresaApi.obtener().then((r) => r.data.data ?? r.data),
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    values: empresa ? { nombre: empresa.nombre, nit: empresa.nit ?? '', emailContacto: empresa.emailContacto, telefono: empresa.telefono ?? '' } : undefined,
  });
  const onSubmit = async (data: EmpresaForm) => {
    try {
      await empresaApi.actualizar(data);
      useAuthStore.setState(state => ({ empresa: state.empresa ? { ...state.empresa, nombre: data.nombre } : null }));
      qc.invalidateQueries();
      toast.success('Empresa actualizada');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al guardar'); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div><label className="label">Nombre de la empresa *</label><input {...register('nombre')} className="input" />{errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}</div>
      <div><label className="label">NIT / RUC</label><input {...register('nit')} className="input" placeholder="Ej: 900.123.456-7" /></div>
      <div><label className="label">Email de contacto *</label><input type="email" {...register('emailContacto')} className="input" />{errors.emailContacto && <p className="text-xs text-red-400 mt-1">{errors.emailContacto.message}</p>}</div>
      <div><label className="label">Teléfono</label><input {...register('telefono')} className="input" placeholder="Ej: +57 300 000 0000" /></div>
      <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</button>
    </form>
  );
}

// ─── Tab Config ──────────────────────────────────
function TabConfig() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['empresa-config'],
    queryFn: () => empresaApi.configuracion().then((r) => r.data.data ?? r.data),
  });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    values: config ? { notifEmail: config.notifEmail, diasAvisoMantenimiento: config.diasAvisoMantenimiento, zonaHoraria: config.zonaHoraria, moneda: config.moneda } : undefined,
  });
  const onSubmit = async (data: ConfigForm) => {
    try {
      await empresaApi.actualizarConfiguracion(data);
      qc.invalidateQueries();
      toast.success('Configuración guardada');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al guardar'); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between p-4 bg-ink rounded-xl">
        <div>
          <p className="text-sm font-medium text-zinc-200">Notificaciones por email</p>
          <p className="text-xs text-zinc-400">Preferencia guardada; la demo no envía correos</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" {...register('notifEmail')} className="sr-only peer" />
          <div className="w-10 h-6 bg-zinc-600 peer-checked:bg-brand rounded-full transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </label>
      </div>
      <div>
        <label className="label">Días de aviso antes del mantenimiento</label>
        <input type="number" min={1} max={30} {...register('diasAvisoMantenimiento')} className="input max-w-xs" />
      </div>
      <div>
        <label className="label">Zona horaria</label>
        <select {...register('zonaHoraria')} className="input">
          <option value="America/Bogota">Bogotá (COT)</option>
          <option value="America/Lima">Lima (PET)</option>
          <option value="America/Mexico_City">Ciudad de México (CST)</option>
          <option value="America/Santiago">Santiago (CLT)</option>
          <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
        </select>
      </div>
      <div>
        <label className="label">Moneda</label>
        <select {...register('moneda')} className="input">
          <option value="COP">COP – Peso colombiano</option>
          <option value="USD">USD – Dólar americano</option>
          <option value="MXN">MXN – Peso mexicano</option>
          <option value="PEN">PEN – Sol peruano</option>
          <option value="CLP">CLP – Peso chileno</option>
          <option value="ARS">ARS – Peso argentino</option>
        </select>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : 'Guardar configuración'}</button>
    </form>
  );
}

// ─── Tab Sedes ───────────────────────────────────
function TabSedes() {
  const toast = useToast();
  const qc = useQueryClient();
  const [sedeModal, setSedeModal] = useState(false);
  const [ubModal, setUbModal] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);

  const { data: sedes = [] } = useQuery({
    queryKey: ['sedes'],
    queryFn: () => sedesApi.listar().then((r) => r.data.data ?? r.data),
  });

  // Crear sede
  const sedeForm = useForm<SedeForm>({ resolver: zodResolver(sedeSchema) });
  const crearSede = async (data: SedeForm) => {
    try {
      await sedesApi.crear(data);
      qc.invalidateQueries();
      toast.success('Sede creada');
      setSedeModal(false);
      sedeForm.reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al crear sede'); }
  };

  // Crear ubicación
  const ubForm = useForm<UbicacionForm>({ resolver: zodResolver(ubicacionSchema) });
  const crearUb = async (data: UbicacionForm) => {
    if (!ubModal) return;
    try {
      await sedesApi.crearUbicacion(ubModal, data);
      qc.invalidateQueries();
      toast.success('Ubicación creada');
      setUbModal(null);
      ubForm.reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al crear ubicación'); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-400">{sedes.length} sede{sedes.length !== 1 ? 's' : ''} registrada{sedes.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setSedeModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Nueva sede</button>
      </div>

      <div className="space-y-2">
        {sedes.map((s: { id: string; nombre: string; ciudad?: string; direccion?: string; ubicaciones?: { id: string; nombre: string; descripcion?: string }[] }) => (
          <div key={s.id} className="card overflow-hidden">
            <button
              onClick={() => setExpandida(expandida === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-ink transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-brand" />
                <div className="text-left">
                  <p className="font-medium text-zinc-100 text-sm">{s.nombre}</p>
                  {s.ciudad && <p className="text-xs text-zinc-400">{s.ciudad}</p>}
                </div>
              </div>
              {expandida === s.id ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
            </button>
            {expandida === s.id && (
              <div className="border-t border-zinc-800 px-4 py-3 space-y-2 bg-ink">
                {s.ubicaciones?.length ? s.ubicaciones.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                    {u.nombre} {u.descripcion && <span className="text-zinc-400">– {u.descripcion}</span>}
                  </div>
                )) : <p className="text-xs text-zinc-400">Sin ubicaciones</p>}
                <button onClick={() => setUbModal(s.id)} className="text-xs text-brand hover:underline flex items-center gap-1 mt-2"><Plus className="w-3 h-3" /> Agregar ubicación</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal nueva sede */}
      <Modal open={sedeModal} onClose={() => setSedeModal(false)} title="Nueva sede">
        <form onSubmit={sedeForm.handleSubmit(crearSede)} className="space-y-4">
          <div><label className="label">Nombre *</label><input {...sedeForm.register('nombre')} className="input" />{sedeForm.formState.errors.nombre && <p className="text-xs text-red-400 mt-1">{sedeForm.formState.errors.nombre.message}</p>}</div>
          <div><label className="label">Dirección</label><input {...sedeForm.register('direccion')} className="input" /></div>
          <div><label className="label">Ciudad</label><input {...sedeForm.register('ciudad')} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setSedeModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" disabled={sedeForm.formState.isSubmitting} className="btn-primary flex-1">Crear sede</button></div>
        </form>
      </Modal>

      {/* Modal nueva ubicación */}
      <Modal open={!!ubModal} onClose={() => setUbModal(null)} title="Nueva ubicación" size="sm">
        <form onSubmit={ubForm.handleSubmit(crearUb)} className="space-y-4">
          <div><label className="label">Nombre *</label><input {...ubForm.register('nombre')} className="input" placeholder="Ej: Sala de servidores" />{ubForm.formState.errors.nombre && <p className="text-xs text-red-400 mt-1">{ubForm.formState.errors.nombre.message}</p>}</div>
          <div><label className="label">Descripción</label><input {...ubForm.register('descripcion')} className="input" /></div>
          <div className="flex gap-3"><button type="button" onClick={() => setUbModal(null)} className="btn-secondary flex-1">Cancelar</button><button type="submit" disabled={ubForm.formState.isSubmitting} className="btn-primary flex-1">Crear</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────
const TABS = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'sedes', label: 'Sedes y ubicaciones', icon: MapPin },
];

export default function ConfiguracionPage() {
  const { usuario } = useAuthStore();
  const [tab, setTab] = useState('empresa');

  if (usuario?.rol !== 'administrador') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-lg font-medium text-zinc-200">Acceso restringido</p>
          <p className="text-sm text-zinc-400 mt-1">Solo administradores pueden acceder a configuración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Administra los datos de tu empresa y preferencias</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs laterales */}
        <div className="lg:w-48 shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-brand/10 text-brand' : 'text-zinc-300 hover:bg-raised'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        {/* Contenido */}
        <div className="flex-1 card p-6">
          {tab === 'empresa' && <TabEmpresa />}
          {tab === 'general' && <TabConfig />}
          {tab === 'sedes' && <TabSedes />}
        </div>
      </div>
    </div>
  );
}

