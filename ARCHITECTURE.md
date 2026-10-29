# Arquitectura · fase 1.5

## Responsabilidades

| Capa                     | Ubicación                                           | Responsabilidad                                                                         |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Contratos matemáticos    | `src/core/types.ts`                                 | Lenguaje, dominio, funciones, relaciones y asignaciones                                 |
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

`#/laboratory` es la entrada predeterminada, incluso para rutas desconocidas. `#/dashboard` ofrece una introducción sobre el mismo universo, sin cuadrícula de tarjetas. `#/editor` abre el editor flotante. La fórmula se conserva entre rutas; no hay persistencia al recargar, backend ni publicación remota.

## Integración futura

La fase 2 incorporará AST, tokenización, parser, validación, variables libres y evaluación determinista en `core/`, con pruebas independientes de React. La fase 3 reemplazará el fixture y sus pasos redactados por trazas reales y metadatos de dependencia. La API temporal y el renderer podrán consumir la presentación compilada desde esos eventos.

Las funciones de aridad n deberán ser totales sobre Dⁿ, con salidas en D y exactamente una salida por entrada. Las relaciones no vacías requieren al menos una tupla, no todas. Un lenguaje sin funciones no necesita tablas ficticias. Las constantes se pueden representar con aridad cero y `inputs: []`; una relación no vacía de aridad cero solo puede contener `()`. Estas validaciones siguen pendientes de fase 2.

## Documentación técnica consultada

- [React Flow: instancia y control de viewport](https://reactflow.dev/api-reference/types/react-flow-instance).
- [React Flow: conexiones SVG personalizadas](https://reactflow.dev/learn/customization/custom-edges).
- [Vite: requisitos y ejecución](https://vite.dev/guide/).
