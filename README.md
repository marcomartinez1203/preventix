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

Los cambios y las sesiones se conservan al reiniciar el servidor. Las sesiones tienen una duración máxima de siete días. Los datos se comparten entre los navegadores conectados al mismo servidor.

Para volver a los datos iniciales, detén el programa y renombra `backend/.data/demo.json` como copia de respaldo. Al iniciar nuevamente se creará un archivo con el usuario y los equipos de ejemplo. Si cambias la contraseña desde Mi perfil, utiliza la nueva al iniciar sesión.

El MVP no envía correos ni implementa análisis predictivo. Los vencimientos se actualizan al consultar la API. El reporte se calcula a partir de la información del backend y se exporta a CSV.

## Publicar todo en Vercel

El repositorio incluye `vercel.json` y `api/index.js` para publicar la interfaz y Express en un solo proyecto y dominio. El backend de Vercel utiliza un archivo JSON en **Vercel Blob privado**, sin PostgreSQL. El usuario inicial es el mismo de la ejecución local.

1. Importa este repositorio en Vercel con **Root Directory `.`**, sin seleccionar `frontend` ni `backend`, y **Framework Preset Other**.
2. En **Storage**, crea un almacén **Blob privado** y conéctalo al proyecto para que Vercel configure `BLOB_READ_WRITE_TOKEN`.
3. Agrega **JWT_SECRET**, una clave aleatoria de al menos 32 caracteres, en las variables del proyecto. Usa el mismo valor para todas las instancias de un entorno.
4. Despliega o pulsa **Redeploy** después de conectar Blob y configurar la clave.

El build, la carpeta de salida y las rutas se leen automáticamente de `vercel.json`. El acceso estará en la URL asignada por Vercel; `/api` y `/health` se sirven en ese mismo dominio. No hace falta `DEMO_MODE` en Vercel: su entrada usa directamente el backend de sustentación.

Los pasos completos y el diagnóstico de configuración están en [VERCEL.md](VERCEL.md).

## Comprobaciones

```sh
npm test
npm run lint --workspace=frontend
npm run build:vercel
```

Las pruebas HTTP cubren autenticación, permisos, renovación y cierre de sesión, equipos, fallas, mantenimientos, métricas, persistencia tras reinicio, validaciones y escrituras concurrentes. También se simulan instancias independientes de Vercel y conflictos ETag de Blob. La prueba del servicio real de Blob requiere el almacén y el token de tu cuenta.

## Backend con PostgreSQL (futuro)

La implementación original de Prisma se conserva. Para seleccionarla, establece `DEMO_MODE=false` en `backend/.env` y configura sus variables de conexión. Ese modo requiere completar y validar su integración; no es necesario para la sustentación. En producción el modo de sustentación no se activa por defecto.
