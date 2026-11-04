# LOGOS · Interactive Logic Laboratory

**No solo evalúes la lógica. Observa cómo razona.**

Curso: MM3032 Lógica Matemática. Integrantes: Diego Quan y Adair Velásquez.

Aplicación frontend para MM3032 — Lógica Matemática. Evalúa fórmulas de primer orden sobre interpretaciones finitas con un motor determinista, y **dibuja y anima el razonamiento real de cada fórmula** en un árbol interactivo.

## Ejecutar

Requisitos: Node.js 22.12 o superior y npm.

```sh
npm ci
npm run dev
```

Abre http://127.0.0.1:5173. El servidor escucha únicamente en la interfaz local.

En este entorno se descargó Node portátil a `.tools/node-v22.22.0-win-x64` (ignorado por Git). Si no tienes Node en PATH, desde PowerShell y la raíz del proyecto:

```powershell
$env:PATH = "$PWD\.tools\node-v22.22.0-win-x64;$env:PATH"
npm.cmd run dev
```

## Verificar

```sh
npm run build
npm test
npm run test:e2e
```

Las pruebas de navegador usan Microsoft Edge instalado. Para otro sistema, cambia `channel: 'msedge'` en `playwright.config.ts` o instala Edge con `npx playwright install msedge`. Playwright inicia y detiene automáticamente su servidor local. `npm run preview` sirve la compilación de producción en el puerto 4173.

Las pruebas visuales generan capturas sin requerir FFmpeg. Para grabar también vídeo, instala `npx playwright install ffmpeg` y ejecuta las pruebas con la variable de entorno `LOGOS_RECORD_VIDEO=1`. En este entorno, las herramientas de grabación se guardan en `.tools/playwright` usando `PLAYWRIGHT_BROWSERS_PATH`.

## Qué puedes hacer

La app tiene dos pestañas: **Evaluador**, que es la entrada, y **Árbol**.

En **Evaluador**:

- Declarar predicados, funciones y constantes (aridad cero), un dominio finito y sus tablas.
- Evaluar fórmulas abiertas y cerradas con ¬, ∧, ∨, →, ↔, ∀, ∃ e igualdad, con botones o desde el teclado (`~`, `&`, `|`, `->`, `<->`, `forall`, `exists`).
- Asignar elementos del dominio a las variables libres detectadas.
- Obtener verdadero/falso con una justificación desplegable, testigos, contraejemplos, entornos y sustituciones de términos.
- Corregir errores con mensajes en español y selección de su posición en la fórmula.

En **Árbol**:

- Ver el árbol de la última evaluación; la app abre con el ejemplo `∀x ∃y P(x,y)` ya evaluado. **Ver razonamiento en el árbol**, en el resultado, lo abre y lo reproduce.
- Reproducir la evaluación paso a paso, en el orden del motor: cada nodo se resuelve después de sus hijos.
- Pausar, reiniciar, avanzar, retroceder, arrastrar la línea de tiempo y cambiar velocidad (0,5× a 2×).
- Saltar a una decisión o a la conclusión desde **Ir a una decisión**. Cada salto pausa la reproducción.
- Recuperar la cámara automática con **Seguir razonamiento** tras explorar manualmente.
- Activar **Movimiento reducido** en el árbol; la preferencia del sistema también se respeta.
- Ampliar, alejar, desplazar y ajustar el árbol. La cámara sigue la animación y cede ante el movimiento manual.
- Ver el árbol completo de lo que evaluó el motor, con el testigo o contraejemplo resaltado. El botón `−` del nodo colapsa una rama y `+N` la vuelve a abrir.
- Seleccionar nodos para destacar su ruta y consultar fórmula, entorno, regla y justificación.
- Activar el modo inmersivo, que dedica toda la pantalla al árbol.
- Usar teclado; se respeta la preferencia de movimiento reducido del sistema.

Cada árbol corresponde a un resultado del motor: toda modificación de fórmula, modelo o asignaciones retira el resultado y su árbol. Los borradores se conservan al cambiar de pestaña y se reinician al recargar. Consulta qué se muestra de cada resultado en [SEMANTICS.md](SEMANTICS.md).

No hay backend ni persistencia remota. Las fuentes de Google son opcionales: existen alternativas del sistema si no hay conexión.

## Probar el motor

En **Evaluador**, conserva el dominio `a, b, c`, el predicado `P` de aridad 2 y las tuplas `(a, b)`, `(b, c)`, `(c, a)`, una por línea.

| Fórmula | Resultado |
| --- | --- |
| `∀x ∃y P(x,y)` | Verdadero; cada x tiene un testigo |
| `∃x P(x,x)` | Falso; se comprueban los tres elementos |
| `∀x ∀y P(x,y)` | Falso; x=a, y=a constituye un contraejemplo |
| `P(x,y)` | Solicita asignaciones; x=a, y=b da verdadero |

Las funciones se introducen con filas como `(a) -> b`. Una constante c se declara como función de aridad cero y se interpreta con `() -> a`. Entonces se puede usar `c` o `c()` en la fórmula. Las etiquetas del dominio no se convierten automáticamente en constantes.

El cuantificador abarca solo la fórmula inmediata, como en la notación del curso: `∀x P(x) → Q(x)` significa `(∀x P(x)) → Q(x)` y deja libre la segunda x. Usa `∀x (P(x) → Q(x))` para ligarla. La implicación se asocia a la derecha. Consulta la gramática y los límites en [SEMANTICS.md](SEMANTICS.md).

Consulta [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [ROADMAP.md](ROADMAP.md) y [PHASE_4_REPORT.md](PHASE_4_REPORT.md). Los informes de fases anteriores se conservan como registro histórico.
