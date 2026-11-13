# LOGOS · Evaluador semántico de lógica de primer orden

**No solo evalúes la lógica. Observa cómo razona.**

| | |
| --- | --- |
| Curso | MM3032 Lógica Matemática |
| Integrantes | Diego Quan · Adair Velásquez |
| Proyecto | Parcial 3: evaluador semántico |
| Repositorio | https://github.com/Adairvlz/parcial3-logica |

## Qué es

LOGOS es una aplicación web que analiza una fórmula de lógica de primer orden y determina si es **verdadera o falsa en una interpretación finita** definida por el usuario. Explica el resultado con las razones decisivas (testigos, contraejemplos y comprobaciones completas) y dibuja **el razonamiento real del motor** como un árbol interactivo y animado, en 2D y en 3D.

La evaluación es local, determinista y auditable: no usa servidor ni inteligencia artificial para calcular resultados. Cada valor de verdad sale de un evaluador recursivo que sigue las definiciones de verdad, entornos e interpretaciones vistas en el curso.

## Cómo ejecutarlo

Requisitos: [Node.js](https://nodejs.org) 22.12 o superior y npm.

```sh
npm install
npm run dev
```

Abre http://127.0.0.1:5173. La app abre en la pestaña **Evaluador** con el ejemplo `∀x ∃y P(x,y)` ya evaluado.

Otros comandos:

| Comando | Para qué |
| --- | --- |
| `npm run build` | Compila la versión de producción (TypeScript estricto + Vite) |
| `npm run preview` | Sirve la compilación de producción en el puerto 4173 |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas de navegador (Playwright) |

Las pruebas de navegador usan Microsoft Edge. Con otro navegador, cambia `channel: "msedge"` en `playwright.config.ts`, por ejemplo por `"chrome"`.

## Uso en tres pasos

1. **Lenguaje e interpretación.** Escribe el dominio (por ejemplo `a, b, c`) y declara los símbolos con su tipo, nombre y aridad. Marca las tuplas de cada relación en la tabla de casillas y elige la salida de cada entrada de las funciones. También puedes cargar un **ejemplo de clase** con un clic.
2. **Fórmula.** Escríbela con los botones `¬ ∧ ∨ → ↔ ∀ ∃ = ( )` o con el teclado (`~ & | -> <-> forall exists`). Si tiene variables libres, la app pide un entorno.
3. **Evaluar.** El resultado muestra Verdadero o Falso con su justificación. **Ver razonamiento en el árbol** abre y anima el árbol de esa evaluación.

## Cumplimiento de los requerimientos

| # | Requerimiento | Cómo se cumple |
| --- | --- | --- |
| 1 | Lenguaje configurable | Se declaran predicados y funciones con nombre y aridad; las constantes son funciones de aridad 0. Se validan nombres, duplicados y aridades. |
| 2 | Interpretación | Dominio finito no vacío, una relación Pᴵ ⊆ Dⁿ por predicado (casillas) y una función total fᴵ: Dⁿ → D por símbolo funcional (un selector por entrada). Se rechazan relaciones vacías y funciones incompletas. |
| 3 | Sintaxis | Conectivos ¬, ∧, ∨, →, ↔, cuantificadores ∀ y ∃, e igualdad entre términos. Parser descendente con precedencia, asociatividad y posiciones de error. |
| 4 | Variables y cuantificadores | Fórmulas abiertas y cerradas. Se detectan las variables libres respetando alcance y sombreado, y se solicita un entorno que las fije en D. |
| 5 | Interfaz | Ingreso gráfico de lenguaje, interpretación, fórmula y entorno. Botones para ¬, ∧, ∨, →, ∀, ∃, ( y ), además de edición con teclado. |
| 6 | Resultado | Verdadero o Falso con explicación de las razones decisivas: **testigo** para un ∃ verdadero, **contraejemplo** para un ∀ falso y **comprobación completa** para un ∀ verdadero o un ∃ falso. |
| 7 | Validación | Errores de sintaxis, símbolos no declarados, aridades, dominio, tuplas fuera del dominio o repetidas, funciones no totales y asignaciones faltantes o inválidas. **Ninguna entrada inválida recibe valor de verdad.** |

## Notación aceptada

- **Conectivos:** `¬ ∧ ∨ → ↔`. Precedencia de mayor a menor: ¬ y cuantificadores, ∧, ∨, →, ↔. La implicación se asocia a la derecha.
- **Cuantificadores:** `∀x` y `∃x` abarcan solo la fórmula inmediata, como en la notación del curso: `∀x P(x) → Q(x)` significa `(∀x P(x)) → Q(x)`. Para ligar ambas x se escribe `∀x (P(x) → Q(x))`.
- **Igualdad:** `t = s`, verdadera si ambos términos valen el mismo elemento de D.
- **Términos:** variables, constantes (`c` o `c()`) y funciones anidadas como `f(g(c), x)`.
- **Teclado:** `~` (¬), `&` (∧), `|` (∨), `->` (→), `<->` (↔), `forall` (∀), `exists` (∃).

La gramática completa, los límites y las decisiones están en [SEMANTICS.md](SEMANTICS.md).

## Aportes creativos

1. **Árbol de razonamiento real.** Cada evaluación genera su propio árbol a partir de la evidencia del motor: un nodo por subfórmula evaluada y una rama por caso del dominio. El testigo o contraejemplo se resalta, y el inspector muestra regla semántica, entorno, términos y explicación de cada nodo. No hay árboles predefinidos.
2. **Reproducción animada.** La evaluación se reproduce paso a paso en el orden del motor: cada nodo se resuelve después de sus hijos. Incluye línea de tiempo con pausa, retroceso, velocidad y salto a cada decisión, sonido sincronizado opcional y efectos de luz que siguen el mismo reloj.
3. **Vista 3D.** El mismo árbol como un cono de esferas que se puede rotar, con la misma animación, colores e inspector que la vista 2D.
4. **Editor gráfico de interpretaciones.** Matriz de casillas para relaciones binarias y selectores para funciones. Las tuplas que dejan de encajar al cambiar el dominio se avisan y se reportan en la validación, en lugar de borrarse en silencio.
5. **Buscador de interpretaciones.** Busca automáticamente un **contraejemplo** (¿es válida?) o un **modelo** (¿es satisfacible?) entre todas las interpretaciones con dominios de hasta 3 elementos, y lo carga en el editor con un clic. Es el ejercicio de Entornos «encontrar una interpretación en que la fórmula sea falsa» resuelto por la app. Si no encuentra nada, no afirma validez: en lógica de primer orden la validez es indecidible (teorema de Church–Turing).
6. **Biblioteca de ejemplos de clase.** Siete ejercicios de Entornos e Interpretaciones, más el ejemplo inicial, listos para cargar con su referencia y el resultado de los apuntes, verificados por pruebas automáticas.

## Decisiones de diseño

- **Constantes como funciones de aridad 0**, porque la consigna pide declarar funciones y predicados. Las etiquetas del dominio no son constantes hasta declararlas.
- **Relaciones no vacías**, como exige la consigna. Una relación no vacía no significa que todo átomo sea verdadero. Por eso el buscador nunca encuentra contraejemplo para `∃x P(x)`, aunque esa fórmula no sea válida en general.
- **Funciones totales:** exactamente una salida en D para cada entrada de Dⁿ.
- **Límites de cálculo:** dominio de hasta 128 elementos, aridad hasta 8 y 250 000 operaciones por evaluación. Si se alcanza el límite, la app lo dice y no da un valor de verdad parcial.

## Arquitectura

La lógica está separada de la interfaz: ningún componente de React calcula valores de verdad.

| Capa | Ubicación |
| --- | --- |
| Parser, validación, evaluador y buscador | `src/core/` |
| Árbol visible y reproducción | `src/reasoning/` |
| Dibujo 2D, 3D y geometría | `src/visualization/` |
| Pantallas | `src/features/` |
| Pruebas | `tests/unit/`, `tests/e2e/` |

Detalle en [ARCHITECTURE.md](ARCHITECTURE.md) y [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); historial en [ROADMAP.md](ROADMAP.md) y los informes de fase.

## Pruebas

- **138 pruebas unitarias:** parser, alcance y variables libres, validación, evaluación con tablas de verdad y comparación contra un oráculo independiente, igualdad, editor de interpretaciones, buscador, árbol, reproducción y geometría. Incluyen los ejemplos resueltos en clase con el resultado de los apuntes.
- **35 pruebas de navegador:** flujos completos del evaluador, del árbol 2D y 3D, de la animación, del sonido y de los errores.

## Uso de inteligencia artificial

Se utilizaron herramientas de inteligencia artificial como apoyo durante el desarrollo, de acuerdo con la política del curso:

- **Claude Code** (Anthropic), usado por Diego Quan como asistente de programación: análisis del material del curso, revisión y corrección del motor semántico frente a la notación de clase, implementación de funcionalidades (editor gráfico, buscador de interpretaciones, árbol a partir de la evidencia del motor y vista 3D), pruebas automatizadas y documentación.
- **Codex** (OpenAI), usado por Adair Velásquez como agente de programación: estructura inicial del proyecto, interfaz y árbol animado (fases 1 y 1.5), primera versión del motor semántico (fase 2), reproducción cinematográfica (fase 4), y efectos de sonido y luz.

Los integrantes definieron los requerimientos y las decisiones de diseño, revisaron el código, probaron manualmente cada funcionalidad y verificaron los resultados contra los ejercicios resueltos en clase.

## Referencias

Anthropic. (2026). *Claude Code* (versión del 13 de noviembre 2026) [Claude Opus 5.5]. https://claude.com/claude-code

OpenAI. (2026). *Codex* [Agente de programación]. https://openai.com/codex/
