# Roadmap

Fases implementadas: 1, 1.5 y **2 — Motor semántico real**. La fase 3 no se ha iniciado.

| Fase                               | Objetivo                                                                        | Dependencia                   | Aceptación                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1 · Foundation & Visual Experience | Shell, dashboard, editor, árbol DEMO, inspector                                 | Ninguna                       | Compila, navega y permite explorar un ejemplo correcto                                                     |
| 1.5 · Visual Revolution            | Árbol orgánico luminoso, secuencia DEMO controlable, cámara y paneles flotantes | Fixture y contratos de fase 1 | Nodos circulares, seis dependencias reales, reproducción reversible, exploración manual y pruebas visuales |
| 2 · Motor semántico                | Parser, validación y evaluación determinista                                    | Contratos core                | Correctitud mediante pruebas matemáticas; entradas inválidas nunca reciben valor de verdad                 |
| 3 · Reasoning Tree Engine          | Trazas reales y layout dinámico                                                 | Motor validado                | Cada nodo y explicación corresponde a una operación del evaluador                                          |
| 4 · Cinematic Reasoning            | Eventos, reproducción, pausa, pasos y velocidad                                 | Trazas estructuradas          | Reproducción sincronizada con razones matemáticas, respetando movimiento reducido                          |
| 5 · Interpretation Studio          | Edición gráfica de dominio, funciones y relaciones                              | Validadores y motor           | Ediciones válidas recalculan resultados; errores se explican en contexto                                   |
| 6 · Final polish                   | Rendimiento, accesibilidad, exportación y presentación                          | Integración completa          | Pruebas exhaustivas y demostración académica verificable                                                   |

La reproducción, la cámara y la propagación visual ya existen para un fixture de siete nodos. En fase 3 se alimentarán desde trazas reales; en fase 4 se extenderán a secuencias arbitrarias, agrupación, contracción y escalabilidad. El escenario sintético de 40 nodos es una prueba de visualización, no un evaluador ni una prueba de fórmulas mayores.

## Alcance de fase 2 implementado

1. Definir gramática, precedencia y asociatividad de ¬, ∧, ∨, →, ↔ y cuantificadores. Acordar igualdad y alias ASCII antes de incluirlos; no asumir símbolos adicionales a la consigna.
2. Crear tokens con posiciones y AST discriminado para términos, átomos, conectivos y cuantificadores. Reportar errores con rangos y mensajes en español.
3. Validar declaraciones, aridades enteras no negativas, símbolos duplicados, dominio finito no vacío, elementos duplicados y tuplas. Validar funciones totales, salidas dentro del dominio y ausencia de ambigüedad en entradas.
4. Exigir relaciones no vacías según consigna. Distinguir relación no vacía de relación universal. Precisar tratamiento de símbolos de aridad cero en documentación y pruebas.
5. Calcular variables libres respetando alcance y sombreado. Solicitar asignaciones solo para las variables libres; validar pertenencia al dominio.
6. Implementar evaluador recursivo puro. Separar validación de evaluación; nunca usar valores de verdad para representar entradas inválidas. No utilizar IA para obtener resultados matemáticos.
7. Probar tablas de verdad, implicación, bicondicional, cuantificadores anidados, sombreado, constantes, funciones compuestas, fórmulas abiertas y testigos/contraejemplos. Incluir casos negativos y límites del dominio.
8. Exponer un resultado estructurado con procedencia real y errores. Conectar un flujo mínimo de evaluación a la UI; la generación completa de árboles arbitrarios y su layout corresponde a fase 3.

Criterio de salida: resultados reproducibles, todas las validaciones obligatorias cubiertas y ninguna lógica matemática ad hoc dentro de componentes React. No retirar la etiqueta DEMO de una traza hasta que provenga efectivamente del motor.

Decisiones adoptadas: no incluir igualdad ni alias ASCII; cuantificadores de alcance amplio hasta el cierre de paréntesis; implicación asociativa a la derecha; relaciones no vacías también para aridad cero; límites operativos explícitos sin resultados parciales. Gramática y ejemplos en `SEMANTICS.md`.

## Próxima fase: 3 — Reasoning Tree Engine

Convertir AST y evidencia en nodos visuales con identidad estable, dependencias y layout arbitrario. Integrar fórmulas reales al árbol orgánico sin modificar la semántica del motor. Distinguir evaluación abreviada de exploración exhaustiva, mostrar testigos y contraejemplos, y producir eventos aptos para el reloj existente. Mantener la DEMO disponible como ejemplo independiente hasta validar esta integración.
