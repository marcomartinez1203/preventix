# Preventix · Taste Skill

Dirección: true-black-flat. Seed: 1291304638. Sin redibujos. Se conservaron la paleta de marca y la familia tipográfica del sistema (`--keep palette,type`).

## Datos y trabajo

- Producto: Preventix, mantenimiento de equipos de cómputo para una sustentación.
- Identidad: el símbolo del JPEG proporcionado, negro y amarillo.
- Usuario: cuenta demo; también se conservan las restricciones de rol existentes.
- Inventario: nombres, series, sedes, responsables, estado e historial por equipo.
- Incidencias: fallas pendientes y recurrencia por equipo; cifras del backend.
- Trabajo: mantenimientos programados, en proceso, vencidos y completados.
- Tiempo: fechas reales de los registros, ordenadas; sin fechas inventadas.
- Costos: resumen del backend, en COP; el costo mensual corresponde a tareas completadas.
- Uso: escritorio para administrar, teléfono para consultar y actualizar.
- Acción principal: abrir la agenda; las tareas vencidas tienen acceso directo al filtro.

## Composición

La fecha de cada revisión se convierte en el ancla visual de la agenda. El amarillo identifica problemas y la recurrencia; la navegación usa texto neutro. El símbolo original se integra mediante CSS sobre el fondo oscuro, sin modificar el JPEG. Los botones principales usan inversión clara sobre negro, según la dirección elegida.

Preguntas por pantalla:
- Inicio: ¿qué equipos y tareas necesitan atención?
- Equipos, fallas y mantenimientos: ¿qué registro debo consultar o actualizar?
- Configuración: ¿qué datos y preferencias necesito cambiar?
- Login: ¿cómo entro o pruebo el programa?

El inicio tiene cifras en una franja, agenda principal y columna de recurrencia/costo. Se eliminó el resumen duplicado del mes. Las tablas usan encabezados en frase normal; se corrigió la cabecera ausente del intervalo entre fallas. Las tarjetas móviles conservan ceros y muestran raya para valores ausentes. La navegación se repliega también en tabletas.

## Validación y límites

Compilación, ESLint y las cuatro pruebas existentes de autenticación demo, diálogo/foco y avisos se ejecutan con el cambio. El lint de Taste pasó de seis errores a cero. Sus avisos restantes corresponden a sombras de elementos flotantes, CSS heredado no importado, el relleno de autocompletado, esqueletos de carga, fechas y rayas para valores ausentes. No se añadieron excepciones al inspector.

La ejecución de `inspect.mjs` para la captura inicial fue rechazada en la solicitud de permiso. No hay capturas antes/después, revisión visual a 1440/768/390, evaluación de contraste renderizado ni puntuación visual. La revisión visual de la skill queda pendiente; compilar y pasar tests no demuestra calidad visual.

No se inventaron estadísticas ni se agregaron muestras: se usa la API existente y su conjunto demo. No se modificó el backend. Antes de un uso real, los equipos, personas y tareas de demostración deben sustituirse por registros reales.
