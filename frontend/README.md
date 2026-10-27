# Preventix — frontend

El frontend se conecta por HTTP al backend Express mediante el proxy `/api` de Vite, configurado hacia `http://127.0.0.1:3001`. No utiliza datos simulados en el navegador.

Para iniciar el programa completo, ejecuta desde la raíz del repositorio:

```sh
npm run dev
```

Abre http://localhost:5173 e inicia sesión con `demo@preventix.com` y `Demo1234`. El formulario incluye esas credenciales para la sustentación. No necesitas registrar una empresa.

Los equipos, fallas y mantenimientos se consultan y modifican en el backend. El servidor guarda los datos en `backend/.data/demo.json`, por lo que se conservan al recargar el navegador y reiniciar el servidor. La sesión utiliza un token JWT y una cookie httpOnly para su renovación. Las sesiones se guardan junto con los datos y se conservan tras reiniciar.

## Recorrido para clase

1. Entra con el usuario predefinido y consulta el dashboard.
2. Registra un equipo y abre su detalle desde el nombre de la tabla.
3. Reporta una falla de ese equipo.
4. Programa un mantenimiento para el mismo equipo y vincula la falla.
5. Cambia el mantenimiento a En proceso y después a Completado. Observa el estado del equipo, el historial y los indicadores del dashboard.
6. Resuelve la falla desde su propio detalle.
7. Consulta Reportes, filtra por fechas y exporta el CSV compatible con Excel.

Las funciones de correo y análisis predictivo quedan fuera del alcance de la sustentación. Las notificaciones son internas. Los reportes se elaboran en el frontend con datos recibidos de la API; el archivo exportado es CSV, no XLSX.

## Desarrollo y verificación

```sh
npm run dev:frontend
npm run test --workspace=frontend
npm run lint --workspace=frontend
npm run build:frontend
```

`dev:frontend` inicia solo la interfaz y requiere tener el backend encendido en otra terminal con `npm run dev:backend`.

La configuración de Vite unifica las copias de React de los workspaces para evitar errores de hooks.

## Vercel

La interfaz y el backend se despliegan juntos desde la raíz del repositorio. No selecciones `frontend` como Root Directory. Sigue `../VERCEL.md` para conectar Blob privado y configurar JWT_SECRET.
