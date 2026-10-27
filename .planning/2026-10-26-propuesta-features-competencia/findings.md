# Findings — Propuesta Features Competencia

## Análisis del proyecto Preventix

### Qué es
SaaS de gestión de mantenimiento de equipos de cómputo. Multi-tenant.
Stack: React 18 + Vite + TailwindCSS v4 + React Query (frontend) | Node.js + Express + TypeScript (backend) | Auth JWT + httpOnly cookie.

### Módulos existentes
| Módulo | Estado |
|---|---|
| Auth (login/refresh/logout/perfil) | ✅ completo |
| Equipos (CRUD + historial + archivar) | ✅ completo |
| Fallas (CRUD + estados + prioridad) | ✅ completo |
| Mantenimientos (CRUD + estados) | ✅ completo |
| Dashboard (KPIs + próximos + recurrentes) | ✅ completo |
| Notificaciones in-app | ✅ completo |
| Usuarios (invitar/rol/estado) | ✅ completo |
| Sedes + ubicaciones | ✅ completo |
| Reportes (CSV) | ✅ básico (existe página) |

### Dominio de datos disponibles
- Equipos: tipo, marca, modelo, OS, RAM, almacenamiento, fecha adquisición, sede
- Fallas: categoría (hardware/software/red/periféricos), prioridad, estado, diagnóstico, solución, fechas
- Mantenimientos: tipo (preventivo/correctivo), costo, fechas, responsable, falla vinculada
- Historial de equipos: eventos con timestamp y usuario
- Usuarios con roles (administrador/responsable/técnico/consulta)

### Gap de la aplicación
- No tiene análisis predictivo (mencionado explícitamente como "40% de interés futuro")
- No tiene visualizaciones de tendencias (solo bar de fallas relativas)
- No tiene scoring de riesgo por equipo
- No tiene planificación de presupuesto
- No tiene gestión de contratos/garantías
- No tiene app móvil ni PWA
- No tiene integración con ITSM/tickets externos

### Insight clave para competencia
El PENDIENTES.md menciona que el análisis predictivo tiene **40% de interés del cliente** y aún no está implementado. Es la oportunidad más diferenciadora y de mayor impacto en la evaluación.
