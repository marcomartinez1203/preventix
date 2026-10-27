# 🏆 Propuesta de Funcionalidades — Preventix para Competencia

> [!IMPORTANT]
> Estas propuestas parten del análisis del código real del proyecto. Cada feature es implementable con el stack existente (React + Express + TypeScript) y ninguna duplica lo que ya funciona.

---

## Resumen ejecutivo

Preventix ya cubre el CRUD esencial. Para **ganar una competencia**, la diferencia la hacen las funcionalidades que demuestran **inteligencia del sistema** — que el software no solo almacena datos sino que *piensa* con ellos. Las propuestas están ordenadas de mayor a menor impacto competitivo.

---

## 🥇 Feature 1 — Motor de Análisis Predictivo de Fallas

**Estado: puntuación heurística implementada (27 de octubre de 2026).** Inicio muestra los cinco equipos con mayor puntuación; el detalle explica cada factor y permite acceder al mantenimiento sugerido. No es una probabilidad ni una predicción validada a 30 días. El endpoint es `GET /api/dashboard/riesgo-equipos`. Se excluyen archivados.

Reglas normalizadas: hasta 40 puntos por 5 fallas en 90 días; hasta 30 por 180 días sin preventivo completado (sin preventivo, desde adquisición o registro); hasta 20 por 5 años de antigüedad; hasta 10 por 2 fallas altas/críticas en 90 días. Cada aporte se limita a su máximo y se redondea antes de sumar. Bajo: 0–29; medio: 30–59; alto: 60–100. Si falta una fecha necesaria, se muestran factores disponibles y «Datos incompletos», sin puntuación total. La fórmula sin normalizar que sigue es la propuesta original, no el cálculo implementado.

**Por qué gana:** el propio documento `PENDIENTES.md` lo identifica con **40% de interés del cliente** y nadie lo ha implementado. Es la funcionalidad más diferenciadora del proyecto.

### Qué hace

Analiza el historial de fallas y mantenimientos para predecir qué equipos tienen **mayor probabilidad de fallar** en los próximos 30 días.

### Algoritmo propuesto (sin ML externo)

```
Score de riesgo por equipo =
  (fallas en últimos 90 días × 0.4)
  + (días desde último mantenimiento preventivo × 0.3)
  + (edad del equipo en años × 0.2)
  + (fallas de prioridad crítica/alta × 0.1)
```

### Implementación

**Backend** — nuevo endpoint:
```
GET /api/analytics/riesgo-equipos
→ [{ equipoId, nombre, scoreRiesgo, nivelRiesgo: 'alto'|'medio'|'bajo', factores[] }]
```

**Frontend** — nueva sección en Dashboard:
- 🔴 Panel "Equipos en riesgo" con semáforo de riesgo
- Click en equipo → sugiere programar mantenimiento preventivo automáticamente
- Badge de riesgo en la página de detalle del equipo

### Impacto competitivo
✅ Muestra inteligencia del sistema  
✅ Totalmente implementable con los datos ya existentes (fallas, mantenimientos, fecha adquisición)  
✅ Esfuerzo: **mediano** (~1-2 días)

---

## 🥈 Feature 2 — Dashboard de Salud del Parque Tecnológico

**Estado: versión mínima implementada (27 de octubre de 2026).** Inicio incluye «Estado general de los equipos» con desglose del índice y tendencias desplegables de seis meses. Endpoint: `GET /api/dashboard/salud-parque`.

El cálculo implementado suma 40 puntos por proporción de equipos activos, 20 por equipos sin fallas pendientes y 40 por equipos con preventivo completado en los últimos 90 días y sin preventivos vencidos. Solo evalúa equipos sin archivar; varias fallas del mismo equipo cuentan una vez para el índice. Sin equipos, no se asigna puntuación. Sin historial preventivo, no se supone cobertura. Favorable desde 80; requiere atención desde 60; atención prioritaria por debajo de 60. Es un indicador operativo por reglas.

Las tendencias muestran eventos de fallas reportadas/resueltas y costos de mantenimientos completados, según la zona horaria configurada, con meses vacíos en cero. Incluyen el historial de equipos archivados para conservar los totales de la organización. No representan un saldo histórico de fallas abiertas ni una serie histórica del índice. La fórmula que sigue es la propuesta original; se corrigieron sus denominadores y agrupaciones en la implementación.

**Por qué gana:** convierte el dashboard actual (4 KPIs simples) en un centro de comando visual que impresiona en demo.

### Qué hace

Un indicador global de **"Salud del parque"** (0–100%) calculado a partir de múltiples métricas, acompañado de gráficas de tendencia.

### Componentes

#### Índice de Salud Global
```
Salud =
  (equipos_activos / total_equipos × 40)
  + (1 - fallas_abiertas / total_equipos × 20)
  + (mantenimientos_al_dia / total_equipos × 40)
```
Visualizado como un **medidor circular** (gauge chart) con color dinámico: verde > 80, amarillo 60-80, rojo < 60.

#### Gráfica de tendencia mensual
- Línea de fallas abiertas vs. cerradas por mes (últimos 6 meses)
- Barras de costo acumulado de mantenimiento
- Calculado al vuelo desde los datos existentes

### Implementación

**Backend:**
```
GET /api/analytics/salud-parque
→ { indice: 87, tendenciaFallas: [{mes, abiertas, cerradas}], tendenciaCostos: [{mes, total}] }
```

**Frontend:**
- Reemplaza el "Resumen del mes actual" por el panel de salud
- Usa SVG inline para el gauge (sin dependencias extras) o `recharts` (ya disponible vía react-query stack)

### Impacto competitivo
✅ Visual impactante en la demo  
✅ Diferencia Preventix de un simple CRUD  
✅ Esfuerzo: **mediano** (~1 día)

---

## 🥉 Feature 3 — Plan de Mantenimiento Inteligente (Auto-scheduler)

**Estado: versión mínima implementada (27 de octubre de 2026).** En Equipos → detalle → «Sugerir mantenimiento» se propone una frecuencia y fecha, se permite elegir responsable y ajustar la fecha, y «Aceptar y programar» guarda un preventivo en el backend. Usa el MTBF estimado existente; con menos de dos fallas o fechas insuficientes propone 30 días. Evita duplicar preventivos pendientes, incluso ante confirmaciones simultáneas. La frecuencia es orientativa: no genera tareas recurrentes ni predice fallas. El inventario muestra «Preventivo recomendado» cuando la revisión vence en siete días o menos y no existe un preventivo pendiente. Abre la confirmación para ajustar fecha y responsable; al programarlo desaparece el indicador.

**Por qué gana:** automatiza la tarea más tediosa del técnico — decidir cuándo hacer mantenimiento preventivo.

### Qué hace

Basado en la frecuencia de fallas históricas de cada equipo, el sistema **sugiere y agenda automáticamente** el próximo mantenimiento preventivo.

### Lógica

```
frecuencia_sugerida_días =
  si avg_dias_entre_fallas < 30 → sugerir cada 15 días
  si avg_dias_entre_fallas < 90 → sugerir cada 30 días
  si avg_dias_entre_fallas >= 90 → sugerir cada 60 días
```

### UX

1. En `EquipoDetallePage.tsx` → nuevo botón **"Sugerir mantenimiento"**
2. Al hacer click: muestra un `SlideOver` (componente ya existe) con:
   - Frecuencia sugerida y justificación
   - Fecha propuesta para el próximo mantenimiento
   - Botón "Aceptar y programar" → crea el mantenimiento automáticamente vía `POST /mantenimientos`
3. Badge "⚡ Recomendado" en equipos donde el sistema detecta que se acerca la fecha.

### Impacto competitivo
✅ Demuestra valor de negocio real: ahorra tiempo al técnico  
✅ Usa componentes ya construidos (`SlideOver`, `Modal`)  
✅ Esfuerzo: **pequeño** (~4 horas)

---

## 🏅 Feature 4 — Tiempo Medio Entre Fallas (MTBF) por Equipo

**Por qué gana:** es un KPI estándar de la industria de mantenimiento. Mencionarlo en la presentación demuestra conocimiento del dominio.

### Qué es

**MTBF** (Mean Time Between Failures): promedio de tiempo que un equipo opera sin fallar. Cuanto más alto, mejor.

```
MTBF_equipo = (período_analizado_días) / (número_de_fallas)
```

### Implementación

**Backend:**
```
GET /api/analytics/mtbf
→ [{ equipoId, nombre, mtbfDias, totalFallas, clasificacion: 'excelente'|'bueno'|'regular'|'crítico' }]
```

**Frontend:**
- Nueva columna en `EquiposPage.tsx` o en la página de reportes
- Clasificación visual con colores:
  - 🟢 Excelente: MTBF > 90 días
  - 🟡 Bueno: 30-90 días
  - 🟠 Regular: 15-30 días
  - 🔴 Crítico: < 15 días

### Impacto competitivo
✅ Terminología profesional que impresiona al jurado  
✅ 100% calculable con datos ya existentes  
✅ Esfuerzo: **mínimo** (~2 horas)

---

## 🎖️ Feature 5 — Módulo de Presupuesto y Control de Costos

**Estado: presupuesto mensual y anual implementado (27 de octubre de 2026).** El administrador define ambos límites independientes en Configuración → General; 0 significa sin límite. Inicio muestra consumo mensual y anual; Reportes → Presupuesto incluye comparativa por mes y exportación CSV. Cuenta costos de mantenimientos completados por fecha de finalización y zona horaria configurada. Conserva límites mensuales desde el primer registro; los cambios afectan el mes actual y siguientes, sin inventar límites anteriores. La proyección anual utiliza el promedio de meses cerrados × 12, como mínimo el gasto acumulado; en enero no hay proyección. Las alertas persistentes del 80% y exceso se generan al guardar mantenimientos/configuración o consultar notificaciones, sin cron ni correo, y no se duplican al consultar. Endpoint: `GET /api/dashboard/presupuesto`.

**Por qué gana:** convierte Preventix de herramienta técnica a herramienta de negocio — habla el lenguaje de gerentes y directivos.

### Qué hace

Permite definir un **presupuesto mensual/anual** de mantenimiento y visualizar en tiempo real el consumo vs. lo presupuestado.

### Componentes

**Configuración** (en `ConfiguracionPage.tsx`):
- Campo: `presupuestoMensualMantenimiento` (COP)
- Campo: `presupuestoAnualMantenimiento` (COP)

**Dashboard:**
- Nueva card: "Presupuesto del mes"
  ```
  Usado: $285,000 / Presupuesto: $500,000 (57%)
  [████████░░░░░░░░] 57%
  ```
- Alerta automática si se supera el 80% del presupuesto → notificación in-app

**Reportes:**
- Gráfica de barras: gasto real vs. presupuesto por mes
- Proyección a fin de año

### Implementación

- Datos de costo: ya existen en `mantenimientos.costo`
- Presupuesto: nuevo campo en `db.configuracion`
- Sin backend nuevo requerido en la demo: calculable desde el store existente

### Impacto competitivo
✅ Argumento de negocio: ROI, control financiero  
✅ Muy visual en demo  
✅ Esfuerzo: **mediano** (~6 horas)

---

## 🎗️ Feature 6 — Gestión de Garantías y Contratos de Soporte

**Estado: versión mínima implementada (27 de octubre de 2026).** Registrar/editar equipo permite guardar vencimiento de garantía, proveedor y vencimiento de contrato; vaciar fechas elimina la cobertura registrada. Inventario y detalle muestran vigencia y días restantes. Inventario y Reportes → Garantías y contratos filtran coberturas vencidas, próximas a vencer y equipos sin garantía vigente; el reporte exporta CSV.

Los avisos persistentes se generan al consultar notificaciones o guardar equipos, dentro de las ventanas de 30 y 7 días y después del vencimiento; no hay envío de email ni cron. No se duplican al recargar. Al renovar, quitar fechas o archivar se marcan leídos los avisos obsoletos. El día de vencimiento aún cuenta como vigente; se usa la zona horaria de la empresa. Los equipos anteriores conservan «Sin registrar» hasta completar sus fechas.

**Por qué gana:** ningún sistema básico de mantenimiento lo incluye, pero es un dolor real de las empresas.

### Qué hace

Cada equipo puede tener registrada su **garantía** y **contrato de soporte**, con alertas automáticas cuando están próximos a vencer.

### Campos nuevos en Equipo

```typescript
garantiaVencimiento?: string;    // fecha ISO
contratoSoporte?: string;        // nombre del proveedor
contratoVencimiento?: string;    // fecha ISO
```

### Funcionalidades

1. **Indicador en lista de equipos:** ícono 📋 si tiene contrato vigente, ⚠️ si vence en < 30 días, ❌ si está vencido
2. **Notificación automática:** 30 y 7 días antes del vencimiento → crea `Notificacion` in-app
3. **Filtro en reportes:** "Equipos sin garantía" o "Contratos por vencer"

### Impacto competitivo
✅ Feature que los competidores básicos no tienen  
✅ Resonancia inmediata con evaluadores de empresas reales  
✅ Esfuerzo: **pequeño** (~4 horas en el demo store)

---

## 📊 Tabla de Priorización

| # | Feature | Impacto Competitivo | Esfuerzo | Prioridad |
|---|---------|:-------------------:|:--------:|:---------:|
| 1 | Análisis Predictivo de Fallas | ⭐⭐⭐⭐⭐ | Mediano | 🔴 PRIMERO |
| 2 | Dashboard de Salud del Parque | ⭐⭐⭐⭐ | Mediano | 🔴 SEGUNDO |
| 3 | Auto-scheduler de Mantenimiento | ⭐⭐⭐⭐ | Pequeño | 🟠 TERCERO |
| 4 | MTBF por Equipo | ⭐⭐⭐ | Mínimo | 🟠 CUARTO |
| 5 | Control de Presupuesto | ⭐⭐⭐ | Mediano | 🟡 QUINTO |
| 6 | Gestión de Garantías | ⭐⭐ | Pequeño | 🟡 SEXTO |

---

## 🎯 Estrategia para la Demo

```mermaid
flowchart LR
    A["🔴 Análisis\nPredictivo"] --> B["🔴 Dashboard\nde Salud"]
    B --> C["🟠 Auto-scheduler"]
    C --> D["🟠 MTBF"]
    D --> E["🟡 Presupuesto"]

    style A fill:#ef4444,color:#fff
    style B fill:#f97316,color:#fff
    style C fill:#eab308,color:#fff
    style D fill:#22c55e,color:#fff
    style E fill:#3b82f6,color:#fff
```

> [!TIP]
> Para la demo en vivo: implementar Features 1 y 2 primero. Son las que más "wow" generan visualmente y las que más peso tienen en la evaluación según el `PENDIENTES.md`. Con solo esas dos, Preventix pasa de ser un "CRUD avanzado" a ser un "sistema inteligente de gestión".

> [!NOTE]
> Todas las propuestas son implementables **sin cambiar la arquitectura actual** y sin base de datos externa (funcionan con el `demo store` de JSON). Los datos necesarios para los cálculos **ya existen** en el sistema.
