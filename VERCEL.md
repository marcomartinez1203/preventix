# Publicar Preventix completo en Vercel

La interfaz React y la API Express se publican en **un único proyecto**, bajo el mismo dominio. Las peticiones a `/api` llegan a una Vercel Function. La API no utiliza el servidor que escucha en localhost ni conecta Prisma.

## Configuración en el panel

1. Importa `marcomartinez1203/preventix` desde GitHub.
2. Selecciona **Root Directory `.`** (la raíz del repositorio). Si antes seleccionaste `frontend`, cambia esta opción en Settings antes de volver a desplegar.
3. Selecciona **Framework Preset Other**. El archivo `vercel.json` ya establece:
   - Instalación: `npm ci`.
   - Build: `npm run build:vercel`.
   - Salida: `frontend/dist`.
   - Función: `api/index.js`, que exporta Express compilado.
   - Rutas de API, health check y navegación de React.
4. Usa **Node.js 24.x**, también indicado en `package.json`.
5. En **Storage → Create Database/Store → Blob**, crea un almacén de acceso **Private** y conéctalo a este proyecto. Selecciona Production y, si vas a probar previews, Preview. Vercel agregará `BLOB_READ_WRITE_TOKEN` automáticamente. No uses un almacén público: el archivo contiene los datos de la aplicación y las sesiones.
6. En **Settings → Environment Variables**, agrega **JWT_SECRET** con una clave aleatoria de al menos 32 caracteres. Para generar una en tu terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

7. Pulsa **Deploy** o **Redeploy** si el proyecto ya tenía un despliegue. Conectar Blob o cambiar variables requiere un nuevo despliegue para aplicarlas.

No subas el token de Blob ni JWT_SECRET al repositorio ni uses el prefijo `VITE_` para estas variables: son exclusivas del backend. No necesitas configurar `DATABASE_URL`, `FRONTEND_URL` ni `DEMO_MODE` para esta entrada de Vercel.

## Acceso y datos

Abre la URL generada por Vercel e inicia sesión:

- Correo: `demo@preventix.com`.
- Contraseña inicial: `Demo1234`.

Los datos iniciales se crean en la primera operación válida. Prueba registrar un equipo, una falla y un mantenimiento; recarga la página y consulta el dashboard. El archivo persistente de producción es `preventix/production/demo.json`. Los previews usan `preventix/preview/demo.json`, separados de producción. Puedes cambiar la ruta con `DEMO_BLOB_PATH`; todos los previews comparten su ruta predeterminada.

Las sesiones también se guardan en Blob, por lo que funcionan cuando Vercel cambia de instancia. Los tokens se firman con JWT_SECRET y la renovación usa una cookie Secure/httpOnly. Cerrar sesión revoca la sesión compartida. Cambiar JWT_SECRET invalida las sesiones existentes y requiere iniciar sesión otra vez.

Las lecturas omiten la caché de Blob para mostrar la versión actual y las escrituras utilizan ETag con reintentos para evitar perder cambios concurrentes. El archivo completo es adecuado para esta demostración de clase; no sustituye una base de datos para una aplicación con mucha concurrencia.

## Comprobación

- `/health` debe devolver `status: ok` y `mode: sustentacion-vercel`. Comprueba que la función responde; no verifica las credenciales de Blob.
- Si faltan variables, `/api` responde **503** indicando las que debes configurar.
- Si el login informa un error de almacenamiento, revisa los logs de la función, el acceso **Private** del Blob y que el token esté conectado al entorno del despliegue.
- Si una URL como `/equipos` da 404 al recargar, verifica que Root Directory siga siendo `.` y que el despliegue incluya `vercel.json`.

La ejecución local sigue usando `npm run dev` y `backend/.data/demo.json`; sus datos no se copian automáticamente a Blob.

## Validación antes de subir

```sh
npm test
npm run lint --workspace=frontend
npm run build:vercel
```

Las pruebas de Blob usan un doble del SDK para comprobar conflictos y sesiones entre instancias sin credenciales externas. El build compila ambos proyectos y prueba la entrada de la Function, pero la validación final del servicio real requiere desplegar con el Blob de tu cuenta.

Referencias oficiales: [Funciones Node.js](https://vercel.com/docs/functions/runtimes/node-js), [Blob privado](https://vercel.com/docs/vercel-blob/private-storage) y [SDK Blob](https://vercel.com/docs/vercel-blob/using-blob-sdk).
