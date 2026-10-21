# Preventix — Pendientes de desarrollo

## Actualización: MVP conectado para sustentación

El frontend se conecta al backend Express por HTTP. El backend valida el usuario predefinido `demo@preventix.com` / `Demo1234` y persiste equipos, fallas, mantenimientos y configuración en `backend/.data/demo.json`. No se requiere base de datos externa.

El despliegue conjunto en Vercel está preparado mediante `vercel.json` y una Function de Express. Utiliza un JSON privado de Vercel Blob para persistir datos y sesiones entre instancias. Consulta `VERCEL.md` para conectar el almacén y configurar JWT_SECRET.

Ejecuta `npm run dev` para iniciar ambas partes. El modo de sustentación está activo por defecto en desarrollo. El frontend ya no utiliza un adaptador local ni guarda el inventario en el navegador. Consulta `README.md` y `frontend/README.md` para el recorrido de clase y las pruebas.

Los vencimientos se actualizan al consultar la API; hay notificaciones internas y reportes CSV compatibles con Excel. El envío de correos, el análisis predictivo y la integración de producción con PostgreSQL quedan fuera del MVP para clase.

La lista histórica siguiente corresponde a necesidades de producción previas a este MVP. Sus afirmaciones sobre pantallas faltantes o proxy no configurado ya no reflejan el estado actual. La integración original con Prisma se conserva con `DEMO_MODE=false`, pendiente de validación integral.

---

## Contexto del proyecto

**Preventix** es una aplicación SaaS multi-tenant para la gestión de mantenimiento de equipos de cómputo. Está construida con:

- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL (Supabase)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + React Query
- **Autenticación**: JWT con access token + refresh token en cookie httpOnly

### Estado actual (lo que ya funciona)

| Módulo | Backend | Frontend |
|---|:---:|:---:|
| Autenticación (login/registro/refresh/logout) | ✅ | ✅ |
| Gestión de equipos (CRUD + historial + archivar) | ✅ | ✅ |
| Registro de fallas (CRUD + cambio de estado) | ✅ | ✅ |
| Gestión de mantenimientos (CRUD + cambio de estado) | ✅ | ✅ |
| Dashboard con KPIs y gráficas | ✅ | ✅ |
| Notificaciones in-app (campana en navbar) | ✅ | ✅ |
| Gestión de usuarios (invitar, editar rol/estado) | ✅ | ✅ |
| Configuración de empresa, general y sedes | ✅ | ✅ |
| Componentes comunes (Modal, SlideOver, Toast, Skeleton) | — | ✅ |

---

## Lo que falta

### 🔴 Crítico — sin esto el sistema no es funcional en producción

#### 1. Módulo de Reportes (backend + frontend)
El directorio `backend/src/modules/reportes/` está vacío. Es la función con **50 % de interés** según los requisitos del cliente.

**Backend — crear:**
- `GET /api/reportes/equipos` → lista de equipos con sus estadísticas (fallas y mantenimientos totales)
- `GET /api/reportes/mantenimientos` → mantenimientos en rango de fechas con costo acumulado
- `GET /api/reportes/fallas` → fallas agrupadas por categoría y equipo (para detectar recurrencia)
- `GET /api/reportes/equipos/export` → exportar a CSV/Excel (usando `exceljs`)
- `GET /api/reportes/mantenimientos/export` → exportar a CSV/Excel

**Frontend — crear:**
- Página `pages/reportes/ReportesPage.tsx` con:
  - Filtros de rango de fechas
  - Selector de tipo de reporte (equipos / mantenimientos / fallas)
  - Tabla de resultados
  - Botón "Exportar a Excel"

---

#### 2. Seed de base de datos
El archivo `backend/prisma/seed.ts` existe pero no se ha verificado ni ejecutado. Sin datos iniciales es imposible probar el sistema.

**Falta:**
- Plan por defecto (`free`) con límites básicos
- `ConfiguracionEmpresa` creada automáticamente al registrar una empresa (actualmente el endpoint `GET /empresa/configuracion` lanza 404 si no existe)
- Datos de ejemplo: 1 empresa demo, 5 equipos, 3 fallas, 2 mantenimientos

---

#### 3. Proxy de Vite no configurado
El frontend hace peticiones a `/api/...` pero Vite no sabe a qué puerto redirigirlas en desarrollo.

**Falta en `frontend/vite.config.ts`:**
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

---

#### 4. Variables de entorno
El archivo `.env.example` existe pero no hay un `.env` real para levantar el proyecto.

**Falta documentar y crear:**
- `backend/.env` con `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`
- `frontend/.env` (vacío, la URL del backend se maneja por el proxy)

---

### 🟡 Importante — afectan la experiencia pero el sistema corre sin ellos

#### 5. Detección automática de mantenimientos vencidos
Actualmente los mantenimientos **no se marcan como `vencido`** automáticamente. El dashboard los cuenta como vencidos por fecha pero el campo `estado` en la BD no cambia.

**Falta:**
- Job programado (cron) que corra cada hora o día y actualice `estado = 'vencido'` donde `fechaProgramada < hoy AND estado = 'programado'`
- Opciones: `node-cron` dentro del mismo proceso, o un script externo en Supabase Edge Functions

---

#### 6. Generación automática de notificaciones de alerta
El modelo `AlertaMantenimiento` y `Notificacion` existen en la BD pero **ningún código los crea**.

**Falta:**
- Cuando se crea un mantenimiento, programar alertas X días antes (según `ConfiguracionEmpresa.diasAvisoMantenimiento`)
- El job cron debe crear `Notificacion` para el responsable cuando la alerta se dispare
- Si `notifEmail = true`, enviar email (integrar Resend, SendGrid o Nodemailer)

---

#### 7. Página de detalle de equipo
Al hacer clic en un equipo solo se puede editar. No hay una vista de perfil completo del equipo que muestre:
- Datos técnicos completos
- Historial de mantenimientos del equipo
- Fallas registradas del equipo
- Línea de tiempo de eventos

**Falta:**
- Ruta `/equipos/:id` en `App.tsx`
- Página `pages/equipos/EquipoDetallePage.tsx`

---

#### 8. Filtro de búsqueda en fallas — parámetro `search` no implementado en backend
El frontend envía `?search=...` pero `fallas.routes.ts` no tiene ese filtro en el `where` de Prisma (solo filtra por `equipoId`, `estado`, `prioridad`).

**Falta en `fallas.routes.ts`:**
```ts
if (busqueda) {
  where['OR'] = [
    { titulo: { contains: busqueda, mode: 'insensitive' } },
    { descripcion: { contains: busqueda, mode: 'insensitive' } },
  ];
}
```

---

#### 9. Filtro de búsqueda en mantenimientos — mismo problema
`mantenimientos.routes.ts` no maneja `?search=` ni `?tipo=`.

---

#### 10. Perfil de usuario / cambio de contraseña
No hay forma de que el usuario cambie su propia contraseña o actualice su nombre.

**Falta:**
- `PUT /api/auth/perfil` → actualizar nombre y contraseña propia
- Modal o página de perfil en el frontend (desde el avatar en la navbar)

---

### 🟢 Deseable — mejoras de calidad y UX

#### 11. Paginación real en tablas
Todas las tablas cargan todos los registros en una sola llamada. El backend ya soporta paginación (`page`, `limit`) pero el frontend ignora el `pagination` de la respuesta.

**Falta:**
- En `EquiposPage`, `FallasPage` y `MantenimientosPage`: leer `pagination.totalPages` y mostrar controles de página siguiente/anterior

---

#### 12. Dashboard — respuesta del backend con estructura diferente
El endpoint `GET /dashboard/resumen` responde con:
```json
{ "inventario": {...}, "fallas": {...}, "mantenimientos": {...} }
```
Pero el frontend espera campos planos como `totalEquipos`, `fallasPendientes`, etc.

**Falta:** adaptar el mapeo en `DashboardPage.tsx` o normalizar la respuesta del backend.

---

#### 13. Página 404
No existe una ruta de fallback amigable para URLs inválidas.

**Falta:** componente `pages/NotFoundPage.tsx` y ajustar `App.tsx`.

---

#### 14. Análisis predictivo (40 % interés — futuro)
Requiere suficiente historial acumulado. Se implementará en una segunda fase cuando haya datos reales.

**Planificado:**
- Identificar equipos con más de N fallas en los últimos 6 meses
- Calcular tiempo promedio entre fallas por equipo
- Sugerir frecuencia de mantenimiento preventivo personalizada

---

## Resumen por prioridad

| # | Pendiente | Prioridad | Esfuerzo |
|---|---|:---:|:---:|
| 1 | Módulo de reportes (backend + frontend) | 🔴 Alta | Grande |
| 2 | Seed de base de datos | 🔴 Alta | Pequeño |
| 3 | Proxy de Vite | 🔴 Alta | Mínimo |
| 4 | Variables de entorno documentadas | 🔴 Alta | Mínimo |
| 5 | Cron de mantenimientos vencidos | 🟡 Media | Mediano |
| 6 | Generación de alertas y emails | 🟡 Media | Grande |
| 7 | Página detalle de equipo | 🟡 Media | Mediano |
| 8 | Filtro `search` en fallas (backend) | 🟡 Media | Mínimo |
| 9 | Filtro `search` en mantenimientos (backend) | 🟡 Media | Mínimo |
| 10 | Perfil de usuario / cambio de contraseña | 🟡 Media | Mediano |
| 11 | Paginación real en tablas | 🟢 Baja | Mediano |
| 12 | Mapeo dashboard frontend ↔ backend | 🟢 Baja | Mínimo |
| 13 | Página 404 | 🟢 Baja | Mínimo |
| 14 | Análisis predictivo | 🟢 Baja (futuro) | Grande |
