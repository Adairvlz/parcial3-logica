# Arquitectura · fase 2

## Responsabilidades

| Capa                     | Ubicación                                           | Responsabilidad                                                                         |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Contratos matemáticos    | `src/core/types.ts`                                 | Lenguaje, dominio, funciones, relaciones y asignaciones                                 |
| Analizador | `src/core/parser.ts` | Tokens con rangos UTF-16, parser descendente y AST de fórmulas y términos |
| Validación | `src/core/validation.ts` | Validación de estructuras externas, lenguaje, dominio, totalización, aridades, alcance y variables libres |
| Evaluación | `src/core/evaluator.ts` | Evaluación pura con presupuesto, cortocircuito y evidencia estructurada |
| Entrada de modelos | `src/features/evaluation/modelEditor.ts` | Conversión de los campos y tablas de la UI a los contratos matemáticos |
| Evaluador gráfico | `src/features/evaluation/SemanticWorkspace.tsx` | Configuración, asignaciones, ejecución, diagnósticos y justificación desplegable |
| Datos demostrativos      | `src/features/demo/scenario.ts`                     | Fixture matemático original, siete nodos y sus seis dependencias                        |
| Contratos de trazas      | `src/reasoning/types.ts`                            | Operación, entorno, estado, testigo y justificación                                     |
| Presentación declarativa | `src/reasoning/demoPlayback.ts`                     | Ocho pasos, tiempos y reconstrucción pura mediante `frameAt`                            |
| Reloj                    | `src/state/usePlayback.ts`                          | Un requestAnimationFrame cancelable; play, pause, seek, velocidad y movimiento reducido |
| Geometría                | `src/visualization/organicLayout.ts`                | Layout orgánico de escritorio/móvil, Bézier y layout de carga sintética                 |
| Escena                   | `src/visualization/ReasoningCanvas.tsx`             | React Flow, núcleos, conexiones, cámara, selección, detalle por zoom y atmósfera        |
| Interfaz contextual      | `src/features/laboratory/`                          | Timeline e inspector sincronizado con el instante de reproducción                       |
| Edición y navegación     | `src/features/editor/`, `src/state/useWorkspace.ts` | Se conserva el editor y su borrador durante la navegación                               |
| Shell                    | `src/App.tsx`, `src/ui/`                            | Barra compacta, paneles flotantes, modo inmersivo, ejemplos y ajustes                   |

React 19, TypeScript estricto, Vite, React Flow 12 y Lucide. Sin dependencias nuevas: SVG y CSS aportan profundidad 2.5D sin WebGL, Three.js ni un motor de física. Las conexiones son seis curvas de dependencia, no una malla decorativa.

## Fuente matemática y estado de presentación

El fixture original permanece separado del tiempo y de las coordenadas. Para `∀x ∃y P(x,y)`, se conserva un hijo por cada `x ∈ {a,b,c}` y un átomo por testigo: `b`, `c`, `a`. No se agregan intentos fallidos ni ciclos.

`demoTrace.source = 'demo'` sigue siendo la procedencia. `frameAt(time)` devuelve estados visibles y pulsos como función pura del tiempo absoluto. No calcula lógica arbitraria: representa en ocho pasos una demostración previamente verificada. Una hoja se resuelve antes de su existencial; cada existencial devuelve su resultado antes de resolver la raíz.

El inspector consulta **el estado del frame**, no solo el resultado final del fixture. Un nodo pendiente no revela el testigo como encontrado ni muestra su conclusión futura. Al editar una fórmula, se detiene la reproducción y se retiran nodos y resultados; el texto exige igualdad exacta para recuperar el fixture.

## Reloj e interrupciones

Un único RAF avanza `timeRef` y publica actualizaciones aproximadamente a 30 Hz. Play y cambio de velocidad reemplazan la generación activa; pause, seek, restart y desmontaje cancelan callbacks obsoletos. Saltar a un instante reconstruye la escena sin aplicar una cadena de mutaciones acumulativas.

El tiempo no avanza mientras la pestaña está oculta. Se limita el delta al volver de suspensiones, de modo que no se saltan explicaciones por un callback retrasado. Pulsos, crecimiento y halos de evaluación dependen del mismo frame y se congelan al pausar. Solo la atmósfera ambiental tiene movimiento CSS independiente y puede desactivarse.

La cámara usa un RAF cancelable independiente para interpolar un viewport solicitado. Cada cambio de paso reemplaza el objetivo anterior. Pan/zoom manual cancela la transición y desactiva el seguimiento. Los saltos de timeline pueden reenfocar la rama si el seguimiento sigue habilitado. La pausa detiene el movimiento automático en curso; los controles manuales siguen disponibles. Resize y cambios de escena encuadran la composición una vez, no en cada tick.

## Geometría y rendimiento

`TreeLayout` recibe identificadores y padres y devuelve posiciones; no devuelve resultados. El ejemplo tiene una composición deliberadamente asimétrica y otra más estrecha para móvil. Un layout por intervalos de hojas posiciona el fixture sintético de 40 nodos. El tipo de operación, los estados y la selección son atributos separados.

Cada conexión tiene una curva Bézier cúbica, un trazo difuso y un filamento. `pathLength` permite crecimiento reproducible; la misma función cúbica posiciona los pulsos, sin consultas DOM de longitud en cada frame. Las ramas casi verticales se arquean para dejar espacio a las etiquetas.

La cantidad de partículas está acotada: 38 puntos ambientales y como máximo un pulso por conexión; no se generan partículas acumulativas. El caso sintético reduce halos/filtros, no reproduce evaluaciones y activa el renderizado de elementos visibles. Los componentes de nodos y aristas están memoizados. Al acercarse, seleccionar o enfocar aparecen detalles secundarios.

Las pruebas de 40 nodos verifican layout e interacción, no garantizan rendimiento con cientos. Quedan pendientes agrupación, contracción, layout de trazas arbitrarias y presupuestos de animación para árboles grandes.

## Rutas y estado

`#/laboratory` es la entrada predeterminada, incluso para rutas desconocidas. `#/dashboard` ofrece una introducción sobre el mismo universo, sin cuadrícula de tarjetas. `#/editor` abre el editor flotante. `#/evaluate` muestra el motor real y oculta el espacio DEMO. La fórmula y el modelo editable se conservan entre rutas; no hay persistencia al recargar, backend ni publicación remota.

## Pipeline semántico

1. `readModelDraft` convierte las tablas textuales de la UI; no decide validez matemática.
2. `validateModel` comprueba las estructuras recibidas, declaraciones, dominio y todas las interpretaciones, incluso si la fórmula no usa un símbolo. La totalización se demuestra por cardinalidad exacta con BigInt: entradas válidas, únicas y exactamente |D|ⁿ; no hace falta materializar el producto cartesiano.
3. `tokenize` y `parseFormula` producen un AST con rangos de origen. La declaración de funciones identifica las constantes de aridad cero; los demás identificadores de términos sin aplicación son variables.
4. `analyzeAST` valida todos los símbolos y aridades, incluidos los operandos que después se puedan omitir por cortocircuito. Calcula variables libres respetando los cuantificadores y el sombreado.
5. Se valida el entorno completo; las variables libres faltantes producen `needs-assignment`, sin valor de verdad.
6. `evaluateRequest` recorre el AST con mapas de entorno independientes por cuantificador. No muta el modelo ni deja escapar asignaciones ligadas a las ramas hermanas.
7. El resultado distingue `invalid`, `needs-assignment`, `limit` y `evaluated`. Solo el último contiene un booleano, junto con procedencia `engine`, operaciones y evidencia.

La evidencia contiene operación tipada, rango de fórmula, entorno, explicación, valores de términos, hijos comprobados, testigos/contraejemplos y cortocircuitos. Conserva todos los casos necesarios para universal verdadero o existencial falso. El frontend solo presenta estos datos; no calcula reglas lógicas. La vista de evidencia monta sus descendientes al expandirlos.

La evaluación es síncrona y está acotada a 10000 operaciones, sin worker ni backend. Las entradas también tienen límites explícitos. Alcanzar un límite nunca convierte un cálculo incompleto en falso. Cada edición invalida inmediatamente el resultado; ocultar una vista no pierde su borrador. El árbol luminoso no consume todavía evidencia real.

## Integración futura

El motor de fase 2 ya produce resultados y evidencia estructurada en `core/`, con pruebas independientes de React. La fase 3 convertirá esa evidencia y el AST en trazas visuales, identificadores de nodos, conexiones y layout arbitrario. La API temporal y el renderer podrán consumir la presentación compilada desde esos eventos.

Las funciones de aridad n deben ser totales sobre Dⁿ, con salidas en D y exactamente una salida por entrada. Las relaciones no vacías requieren al menos una tupla, no todas. Un lenguaje sin funciones no necesita tablas ficticias. Las constantes se representan con aridad cero y `inputs: []`; una relación no vacía de aridad cero solo puede contener `()`. Estas condiciones ya están validadas por el motor.

## Documentación técnica consultada

- [React Flow: instancia y control de viewport](https://reactflow.dev/api-reference/types/react-flow-instance).
- [React Flow: conexiones SVG personalizadas](https://reactflow.dev/learn/customization/custom-edges).
- [Vite: requisitos y ejecución](https://vite.dev/guide/).
