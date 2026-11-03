# Arquitectura

## Responsabilidades

| Capa                     | Ubicación                                           | Responsabilidad                                                                         |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Contratos matemáticos    | `src/core/types.ts`                                 | Lenguaje, dominio, funciones, relaciones y asignaciones                                 |
| Analizador | `src/core/parser.ts` | Tokens con rangos UTF-16, parser descendente y AST de fórmulas y términos |
| Validación | `src/core/validation.ts` | Validación de estructuras externas, lenguaje, dominio, totalización, aridades, alcance y variables libres |
| Evaluación | `src/core/evaluator.ts` | Evaluación pura con presupuesto, cortocircuito y evidencia estructurada |
| Entrada de modelos | `src/features/evaluation/modelEditor.ts` | Conversión de los campos y tablas de la UI a los contratos matemáticos |
| Evaluador gráfico | `src/features/evaluation/SemanticWorkspace.tsx` | Configuración, asignaciones, ejecución, diagnósticos y justificación desplegable |
| Árbol visible | `src/reasoning/tree.ts` | Decide qué parte de la evidencia se dibuja: rama decisiva, comprobación completa, ramas abiertas y límites |
| Reproducción | `src/reasoning/playback.ts` | Compila el árbol en pasos y calcula cada estado con `frameAt`, función pura del tiempo |
| Reloj                    | `src/state/usePlayback.ts`                          | Un requestAnimationFrame cancelable; play, pause, seek, velocidad y movimiento reducido |
| Geometría                | `src/visualization/organicLayout.ts`                | Layout por intervalos de hojas para cualquier árbol y curvas Bézier                     |
| Escena                   | `src/visualization/ReasoningCanvas.tsx`             | React Flow, núcleos, conexiones, cámara, selección, detalle por zoom y atmósfera        |
| Vista del árbol          | `src/features/laboratory/`                          | `ReasoningView` une árbol, reloj y canvas; línea de tiempo e inspector sincronizados    |
| Edición y navegación     | `src/features/editor/`, `src/state/useWorkspace.ts` | Editor de fórmulas y pestaña activa; el borrador se conserva al cambiar de pestaña      |
| Shell                    | `src/App.tsx`, `src/ui/`                            | Barra con dos pestañas, escena del árbol y modo inmersivo                               |

React 19, TypeScript estricto, Vite, React Flow 12 y Lucide. Sin dependencias nuevas: SVG y CSS aportan profundidad 2.5D sin WebGL, Three.js ni un motor de física. Las conexiones son seis curvas de dependencia, no una malla decorativa.

## Del motor al árbol

`Evidence` es la única fuente. `buildVisibleTree` elige qué nodos se dibujan, `compileTimeline` recorre esos nodos en profundidad y produce dos pasos por nodo (entra y se resuelve), y `frameAt(timeline, time)` devuelve estados visibles y pulsos como función pura del tiempo absoluto. Ninguna capa calcula lógica: un nodo se pinta falso porque la evidencia dice falso.

Cada nodo tiene un identificador derivado de su posición en la evidencia (`r`, `r.0`, `r.0.1`), estable al abrir y colapsar ramas. `ReasoningView` se vuelve a montar por cada evaluación, de modo que ramas abiertas y selección no sobreviven a su resultado. Editar fórmula, modelo o asignaciones retira el resultado y deja el árbol vacío.

El inspector consulta **el estado del frame**, no solo el resultado final: un nodo pendiente no revela su conclusión antes de tiempo.

## Reloj e interrupciones

Un único RAF avanza `timeRef` y publica actualizaciones aproximadamente a 30 Hz. Play y cambio de velocidad reemplazan la generación activa; pause, seek, restart y desmontaje cancelan callbacks obsoletos. Saltar a un instante reconstruye la escena sin aplicar una cadena de mutaciones acumulativas.

El tiempo no avanza mientras la pestaña está oculta. Se limita el delta al volver de suspensiones, de modo que no se saltan explicaciones por un callback retrasado. Pulsos, crecimiento y halos de evaluación dependen del mismo frame y se congelan al pausar. Solo la atmósfera ambiental tiene movimiento CSS independiente y puede desactivarse.

La cámara usa un RAF cancelable independiente para interpolar un viewport solicitado. Cada cambio de paso reemplaza el objetivo anterior. Pan/zoom manual cancela la transición y desactiva el seguimiento. Los saltos de timeline pueden reenfocar la rama si el seguimiento sigue habilitado. La pausa detiene el movimiento automático en curso; los controles manuales siguen disponibles. Resize y cambios de escena encuadran la composición una vez, no en cada tick.

## Geometría y rendimiento

`organicLayout` recibe identificadores y padres y devuelve posiciones; no conoce valores. Reserva un intervalo por hoja, así los subárboles no se pisan, con cualquier forma de fórmula.

Cada conexión tiene una curva Bézier cúbica, un trazo difuso y un filamento. `pathLength` permite crecimiento reproducible; la misma función cúbica posiciona los pulsos, sin consultas DOM de longitud en cada frame. Los hermanos se arquean en sentidos opuestos para no cruzarse.

La cantidad de partículas está acotada: 38 puntos ambientales y como máximo un pulso por conexión. El árbol tiene un máximo de 200 nodos; desde 40 se retiran halos y se renderizan solo los elementos visibles. Con más de 15 nodos la cámara deja de perseguir cada paso y mantiene el árbol completo. La duración apunta a unos 26 segundos, sin importar el tamaño.

## Rutas y estado

Solo hay dos vistas. `#/evaluate` (Evaluador) es la entrada predeterminada, incluso para rutas desconocidas. `#/laboratory` (Árbol) muestra el razonamiento de la última evaluación. La fórmula y el modelo editable se conservan al cambiar de pestaña; no hay persistencia al recargar, backend ni publicación remota.

## Pipeline semántico

1. `readModelDraft` convierte las tablas textuales de la UI; no decide validez matemática.
2. `validateModel` comprueba las estructuras recibidas, declaraciones, dominio y todas las interpretaciones, incluso si la fórmula no usa un símbolo. La totalización se demuestra por cardinalidad exacta con BigInt: entradas válidas, únicas y exactamente |D|ⁿ; no hace falta materializar el producto cartesiano.
3. `tokenize` y `parseFormula` producen un AST con rangos de origen. La declaración de funciones identifica las constantes de aridad cero; los demás identificadores de términos sin aplicación son variables.
4. `analyzeAST` valida todos los símbolos y aridades, incluidos los operandos que después se puedan omitir por cortocircuito. Calcula variables libres respetando los cuantificadores y el sombreado.
5. Se valida el entorno completo; las variables libres faltantes producen `needs-assignment`, sin valor de verdad.
6. `evaluateRequest` recorre el AST con mapas de entorno independientes por cuantificador. No muta el modelo ni deja escapar asignaciones ligadas a las ramas hermanas.
7. El resultado distingue `invalid`, `needs-assignment`, `limit` y `evaluated`. Solo el último contiene un booleano, junto con procedencia `engine`, operaciones y evidencia.

La evidencia contiene operación tipada, rango de fórmula, entorno, explicación, valores de términos, hijos comprobados, testigos/contraejemplos y cortocircuitos. Conserva todos los casos necesarios para universal verdadero o existencial falso. El frontend solo presenta estos datos; no calcula reglas lógicas. La vista de evidencia monta sus descendientes al expandirlos.

La evaluación es síncrona y está acotada a 250000 operaciones, sin worker ni backend. Las entradas también tienen límites explícitos. Alcanzar un límite nunca convierte un cálculo incompleto en falso. Cada edición invalida inmediatamente el resultado; ocultar una vista no pierde su borrador. ## Documentación técnica consultada

- [React Flow: instancia y control de viewport](https://reactflow.dev/api-reference/types/react-flow-instance).
- [React Flow: conexiones SVG personalizadas](https://reactflow.dev/learn/customization/custom-edges).
- [Vite: requisitos y ejecución](https://vite.dev/guide/).
