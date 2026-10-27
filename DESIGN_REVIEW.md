# Design review: Preventix

## Summary

**Good, según revisión de código.** Preventix es una aplicación web React para consultar equipos, registrar fallas y organizar mantenimiento. La prioridad es identificar qué requiere atención y actuar sin perder el contexto. La identidad conserva el negro, el amarillo y el logo original; el elemento característico es la ficha técnica de cada registro, especialmente en móvil.

Se aplican los principios y fundamentos de Apple HIG a la web: accesibilidad, jerarquía, adaptación, tipografía y contenido. No se imitan controles nativos de macOS/iOS ni se aplican sus convenciones de navegación como requisitos web. Se revisaron las referencias accessibility, layout, typography, color, designing-for-ios, cross-platform, buttons, modality, lists-and-tables, branding, dark-mode y code-audit de la skill apple-design.

## Critical — corregido en código

- **Controles pequeños.** Las acciones de tabla medían aproximadamente 28 × 28 CSS px (icono de 16 px y padding de 6 px). Ahora las acciones y cierres tienen una zona de 44 × 44 CSS px. La conversión a CSS px es una decisión web, no una equivalencia física con pt. Referencia: `buttons.md › Best practices`: “Make buttons easy for people to use.” Archivos: `RecordCard.tsx`, páginas de Equipos/Fallas/Mantenimientos e `index.css`.
- **Etiquetas y teclado.** Las etiquetas visuales no estaban asociadas con muchos controles y las notificaciones se activaban con divs. Ahora se usan htmlFor/id, nombres accesibles en filtros y botones reales para las notificaciones. Las ventanas aíslan el fondo con inert, contienen el foco, admiten Escape y restauran el foco. El menú móvil usa el mismo mecanismo y se cierra al pasar a escritorio. Referencia: `accessibility.md › Speech`: “Let people use the keyboard alone to navigate and interact with your app.” Archivos: formularios, `Navbar.tsx` y `useDialog.ts`.
- **Bordes de campos.** La separación de los campos respecto del fondo era tenue. Los bordes pasan a #696972 sobre #0D0D0F: **3.57:1**; el foco amarillo conserva **13.56:1** contra el fondo. Referencia: `accessibility.md › Vision`, mínimos de contraste y diferenciación.

## Improvements — implementado

- **High · Listas compactas.** Equipos, Fallas y Mantenimientos muestran fichas por debajo de 640 px y conservan las tablas en anchos regulares. Cada ficha ofrece los mismos comandos que su fila, con etiquetas visibles. Referencia: `lists-and-tables.md › Content`: “Choose a row style that fits the information you need to display.”
- **High · Datos antes que decoración.** Se retira el gran banner del dashboard y se muestra una alerta accionable cuando hay mantenimientos vencidos. El enlace abre directamente el filtro Vencidos. Los errores de red tienen Reintentar y no se presentan como un inventario vacío o métricas cero. Referencia: `layout.md › Visual hierarchy`: “Order content by relative importance.”
- **Medium · Inicio de sesión en móvil.** El formulario aparece primero; la explicación promocional queda para escritorio. La contraseña demo se completa únicamente al pulsar Completar con cuenta demo. El acceso sigue siendo validado por la API y no se añade un bypass.
- **Medium · Recuperación.** Archivar un equipo ofrece Deshacer mediante la API de actualización. Los avisos con una acción y los errores permanecen hasta que la persona los cierra; los avisos informativos se mantienen ocho segundos y admiten cierre manual. Referencia: `accessibility.md › Cognitive`, elementos con tiempo limitado; `modality.md › Best practices`, interrupciones solo cuando aportan un beneficio.
- **Medium · Formularios y filtros.** Los campos tienen al menos 16 CSS px en móvil, los formularios se apilan en una columna y los filtros de estado se pueden envolver. Los resultados vacíos por filtros ofrecen Limpiar filtros. La zona de acciones de los formularios permanece accesible al desplazarse.
- **Medium · Preferencias de accesibilidad.** Se añade contraste aumentado, se respeta movimiento reducido de forma global y se elimina el desenfoque si se solicita transparencia reducida. Los avisos y ventanas usan fondos opacos/elevados para conservar legibilidad. Referencia: `dark-mode.md › Dark Mode colors`, separación entre superficies base y elevadas.

## Craft notes y sistema de tokens

La paleta se fundamenta en la señal de advertencia del logo y en el trabajo de prevención. Se retiraron la marca de agua del dashboard, los acentos decorativos en todas las métricas y la franja rayada repetida del menú. El amarillo se concentra en acciones, selección y atención. El logo completo se conserva en el acceso y se reduce en la navegación para devolver espacio a los registros.

Referencia: `branding.md › Best practices`: “Apply your app’s accent color judiciously.” Mantener controles familiares y retirar decoración se aplica aquí como criterio de diseño, no como exigencia de una apariencia Apple.

| Rol | Variante oscura aplicada | Variante clara de referencia |
|---|---|---|
| Fondo | #0D0D0F | #F5F5F7 |
| Superficie | #19191D; elevada #26262C | #FFFFFF |
| Contenido | #F4F4F5 | #161618 |
| Secundario | #A1A1AA | #5E5E66 |
| Acento | #FFD400 con texto #0D0D0F | #FFD400 con texto #0D0D0F |
| Borde de controles | #696972 | #767680 |

Contrastes calculados desde los valores reales: contenido/superficie **15.95:1**, secundario/superficie **6.84:1**, secundario/superficie elevada **5.87:1**, texto oscuro/acento **13.56:1**. Como referencia de la variante clara, #161618 sobre blanco es **18.07:1** y #5E5E66 sobre blanco es **6.42:1**. La variante clara es una especificación, no un tema activado: se conserva la apariencia oscura elegida por el usuario.

Tipografía: familia de sistema (-apple-system/BlinkMacSystemFont/Segoe UI), títulos de 24–30 px, cuerpo de 16 px en campos móviles, datos de 14–16 px y metadatos de 12 px. Los indicadores y las tablas usan cifras tabulares. La jerarquía depende de tamaño y peso, no de una colección de tipos de letra.

La distribución prioriza el estado y las acciones, convirtiendo columnas en fichas al reducirse el espacio:

```text
Compacto                         Regular
[Menú | Equipos | Perfil]         [Sidebar] [Sección | Perfil]
Equipos           [+ Registrar]            Equipos    [+ Registrar]
[Buscar.......................]            [Buscar | filtros]
[Estado........][Tipo.........]            [Tabla con columnas y acciones]
[Nombre · estado              ]            [Anterior / Siguiente]
[Datos técnicos y responsable ]
[Historial] [Editar] [Archivar ]
[Anterior / Siguiente]
```

Movimiento: se conserva únicamente la entrada discreta de contenido ya existente. Las tarjetas informativas no se elevan al pasar el puntero para no sugerir que son botones. Con movimiento reducido se anulan animaciones y transiciones.

## What works

Se conservan el logo proporcionado, la paleta de marca, la navegación familiar por secciones, los estados con texto además del color, los formularios validados y la conexión real con el backend. Las acciones de las fichas móviles utilizan las mismas funciones que las tablas de escritorio.

## Platform notes y validación

La revisión parte del código, los valores CSS y las referencias locales de la skill. No certifica cumplimiento HIG ni sustituye la revisión con lectores de pantalla. No hubo un navegador conectado durante la revisión.

Antes de dar por cerrada la revisión visual, comprobar en navegador: 320/390/768/1440 px, zoom de texto al 200 %, teclado Tab/Shift+Tab/Escape, VoiceOver o lector equivalente, menú al girar la pantalla, formularios con teclado móvil y preferencias de contraste/movimiento/transparencia. Esos controles manuales se documentan como pendientes, no como pruebas aprobadas.

Validación automática aprobada: cuatro pruebas del frontend (foco y Escape, contención tras rerender, acceso demo por API y persistencia de Deshacer/errores), lint y compilación de producción. Las pruebas de DOM utilizan jsdom; no certifican el aspecto visual ni los tamaños físicos en un navegador.
