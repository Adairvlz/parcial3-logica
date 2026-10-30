# LOGOS — Informe de fase 2

Fecha: 29 de octubre de 2026. Estado: implementada y verificada.

## Resultado

La ruta `#/evaluate`, accesible mediante **Evaluar**, permite definir un lenguaje, un dominio finito y su interpretación, introducir una fórmula y obtener un resultado del motor determinista. Los resultados incluyen una justificación desplegable con entornos, sustituciones de términos, testigos y contraejemplos.

El núcleo implementa tokenización con posiciones, parser, AST, validación del modelo, detección de variables libres y evaluación recursiva. Admite ¬, ∧, ∨, →, ↔, ∀ y ∃, constantes y funciones compuestas. Las funciones deben ser totales y las relaciones no vacías, conforme a la consigna. La gramática, el alcance de cuantificadores y los límites están documentados en [SEMANTICS.md](SEMANTICS.md).

Una entrada inválida, una asignación pendiente o un presupuesto agotado nunca se presenta como falso. Cualquier edición retira el resultado anterior. Los borradores se conservan al navegar y se reinician al recargar.

## Verificación

- Compilación de producción aprobada con TypeScript y Vite.
- 57 pruebas unitarias aprobadas: parser, semántica, validación, modelos, tablas de verdad, alcance, funciones y límites, además de las pruebas existentes.
- Suite de navegador aprobada en Microsoft Edge, incluyendo los seis flujos nuevos del evaluador y las regresiones del árbol demostrativo.
- Comparación del evaluador con un oráculo independiente sobre las 15 relaciones binarias no vacías de un dominio de dos elementos, para cuatro fórmulas cuantificadas.
- Revisión visual en escritorio (1366 × 768) y móvil (390 × 844), sin desbordamiento horizontal ni errores de ejecución en los flujos comprobados.
- `git diff --check` sin errores de espacios.

Capturas conservadas: [escritorio](docs/phase-2/evaluator-desktop.png) y [móvil](docs/phase-2/evaluator-mobile.png).

## Alcance y siguiente fase

El árbol orgánico luminoso de siete nodos permanece como **DEMO** independiente. Los resultados nuevos llevan la etiqueta **MOTOR REAL**. La evidencia semántica ya tiene tipo de operación, rango de origen, entorno e hijos para permitir la integración posterior.

La fase 3 no se ha iniciado: corresponde transformar esa evidencia en árboles orgánicos para fórmulas arbitrarias, con dependencias y distribución dinámica. No se implementaron igualdad, alias ASCII, persistencia remota ni el editor gráfico avanzado de interpretaciones.
