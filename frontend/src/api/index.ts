import api from './client';

export const authApi = {
  perfil: (data: unknown) => api.put('/auth/perfil', data),
  register: (data: unknown) => api.post('/auth/register', data),
  login: (data: unknown) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const equiposApi = {
  sugerencia: (id: string) => api.get(`/equipos/${id}/sugerencia-mantenimiento`),
  listar: (params?: Record<string, string>) => api.get('/equipos', { params }),
  obtener: (id: string) => api.get(`/equipos/${id}`),
  crear: (data: unknown) => api.post('/equipos', data),
  actualizar: (id: string, data: unknown) => api.put(`/equipos/${id}`, data),
  archivar: (id: string) => api.patch(`/equipos/${id}/archivar`),
  cambiarEstado: (id: string, estado: string) => api.patch(`/equipos/${id}/estado`, { estado }),
  historial: (id: string) => api.get(`/equipos/${id}/historial`),
};

export const fallasApi = {
  listar: (params?: Record<string, string>) => api.get('/fallas', { params }),
  obtener: (id: string) => api.get(`/fallas/${id}`),
  crear: (data: unknown) => api.post('/fallas', data),
  actualizar: (id: string, data: unknown) => api.put(`/fallas/${id}`, data),
  cambiarEstado: (id: string, data: unknown) => api.patch(`/fallas/${id}/estado`, data),
};

export const mantenimientosApi = {
  listar: (params?: Record<string, string>) => api.get('/mantenimientos', { params }),
  obtener: (id: string) => api.get(`/mantenimientos/${id}`),
  crear: (data: unknown) => api.post('/mantenimientos', data),
  actualizar: (id: string, data: unknown) => api.put(`/mantenimientos/${id}`, data),
  cambiarEstado: (id: string, data: unknown) => api.patch(`/mantenimientos/${id}/estado`, data),
};

export const dashboardApi = {
  presupuesto: () => api.get('/dashboard/presupuesto'),
  salud: () => api.get('/dashboard/salud-parque'),
  riesgos: () => api.get('/dashboard/riesgo-equipos'),
  resumen: () => api.get('/dashboard/resumen'),
  mantenimientosProximos: () => api.get('/dashboard/mantenimientos-proximos'),
  equiposRecurrentes: () => api.get('/dashboard/equipos-recurrentes'),
  mtbf: () => api.get('/dashboard/mtbf'),
};

export const notificacionesApi = {
  listar: () => api.get('/notificaciones'),
  leer: (id: string) => api.patch(`/notificaciones/${id}/leer`),
  leerTodas: () => api.patch('/notificaciones/leer-todas'),
};

export const sedesApi = {
  listar: () => api.get('/sedes'),
  crear: (data: unknown) => api.post('/sedes', data),
  actualizar: (id: string, data: unknown) => api.put(`/sedes/${id}`, data),
  ubicaciones: (id: string) => api.get(`/sedes/${id}/ubicaciones`),
  crearUbicacion: (id: string, data: unknown) => api.post(`/sedes/${id}/ubicaciones`, data),
};

export const usuariosApi = {
  listar: () => api.get('/usuarios'),
  invitar: (data: unknown) => api.post('/usuarios/invitar', data),
  actualizar: (id: string, data: unknown) => api.put(`/usuarios/${id}`, data),
};

export const empresaApi = {
  obtener: () => api.get('/empresa'),
  actualizar: (data: unknown) => api.put('/empresa', data),
  configuracion: () => api.get('/empresa/configuracion'),
  actualizarConfiguracion: (data: unknown) => api.put('/empresa/configuracion', data),
};
