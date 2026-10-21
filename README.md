# Preventix — MVP para sustentación

Programa de gestión de mantenimiento de equipos con frontend React y backend Express conectados por HTTP. Incluye un usuario predefinido y datos de ejemplo para demostrar el funcionamiento en clase.

## Iniciar

Desde esta carpeta:

```sh
npm install
npm run dev
```

Abre **http://localhost:5173**.

- Correo: **demo@preventix.com**
- Contraseña: **Demo1234**
- Rol: administrador

El formulario de acceso viene completado. Pulsa **Iniciar sesión**. El backend escucha en `http://127.0.0.1:3001` y puedes comprobarlo en `/health`. Usa Ctrl+C para detener ambas partes.

## Qué demuestra

- Inicio de sesión validado por el backend, con JWT y renovación mediante cookie httpOnly.
- Registro, edición, consulta, archivo y recuperación de equipos.
- Reporte de fallas y cambios de estado.
- Programación y seguimiento de mantenimientos vinculados a equipos y fallas.
- Dashboard, detalle e historial de equipos y reportes CSV compatibles con Excel.
- Configuración básica de empresa, sedes y usuarios.

El recorrido sugerido está en `frontend/README.md`.

## Datos para la clase

En desarrollo está activo el modo de sustentación del backend. No necesitas PostgreSQL, Supabase ni configurar `.env`. Los datos se crean automáticamente y se guardan en **backend/.data/demo.json**. El frontend siempre utiliza la API; no guarda el inventario en localStorage.

Los cambios se conservan al reiniciar el servidor. Las sesiones se mantienen en memoria: después de reiniciar el backend debes iniciar sesión de nuevo. Los datos se comparten entre los navegadores conectados al mismo servidor.

Para volver a los datos iniciales, detén el programa y renombra `backend/.data/demo.json` como copia de respaldo. Al iniciar nuevamente se creará un archivo con el usuario y los equipos de ejemplo. Si cambias la contraseña desde Mi perfil, utiliza la nueva al iniciar sesión.

El MVP no envía correos ni implementa análisis predictivo. Los vencimientos se actualizan al consultar la API. El reporte se calcula a partir de la información del backend y se exporta a CSV.

## Comprobaciones

```sh
npm test
npm run lint --workspace=frontend
npm run build:frontend
```

Las pruebas HTTP cubren autenticación, permisos, renovación y cierre de sesión, equipos, fallas, mantenimientos, métricas, persistencia tras reinicio, validaciones y escrituras concurrentes.

## Backend con PostgreSQL (futuro)

La implementación original de Prisma se conserva. Para seleccionarla, establece `DEMO_MODE=false` en `backend/.env` y configura sus variables de conexión. Ese modo requiere completar y validar su integración; no es necesario para la sustentación. En producción el modo de sustentación no se activa por defecto.
