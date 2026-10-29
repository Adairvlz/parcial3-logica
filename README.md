# LOGOS · Interactive Logic Laboratory

**No solo evalúes la lógica. Observa cómo razona.**

Aplicación frontend para MM3032 — Lógica Matemática. La fase **1.5 — Visual Revolution** transforma el laboratorio en un **Organic Luminous Reasoning Tree**: núcleos circulares, conexiones Bézier, crecimiento progresivo y resultados que regresan a la raíz. **No incluye un parser ni un evaluador de fórmulas arbitrarias.**

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

- Entrar directamente al árbol inmersivo. Inicio, Formula Editor y Reasoning Tree siguen disponibles mediante rutas hash y un menú compacto.
- Explorar el ejemplo `∀x ∃y P(x,y)` con `D = {a,b,c}` y `P = {(a,b),(b,c),(c,a)}`.
- Reproducir ocho pasos en 21,6 segundos: raíz, ramificación, tres testigos, propagación, conclusión y vista completa.
- Pausar, reiniciar, avanzar, retroceder, arrastrar la línea de tiempo y cambiar velocidad (0,5× a 2×).
- Ampliar, alejar, desplazar, ajustar el árbol y enfocar la selección. El seguimiento automático cede ante el movimiento manual.
- Seleccionar nodos para destacar su ruta y consultar fórmula, entorno, regla y justificación.
- Editar texto e insertar símbolos en la posición del cursor o sobre una selección, en un panel flotante.
- Restaurar el ejemplo desde el editor, la barra del laboratorio o el diálogo de ejemplos.
- Ocultar paneles y activar el modo inmersivo, que dedica todo el área disponible al canvas.
- Usar teclado, preferencias del sistema y un control explícito de movimiento reducido.
- Ajustar luminosidad y explorar un escenario sintético de 40 nodos, sin atribuirle significado matemático.

Los datos, resultados y trazas se identifican como DEMO. La vista inicial muestra la demostración completa; **Animar** la reconstruye desde la raíz. Los tiempos son de presentación del fixture, no tiempos de cómputo del motor. Cambiar el texto retira el árbol y su resultado. Restaurar exactamente la fórmula del ejemplo recupera la demostración; no ejecuta una evaluación. La edición se conserva durante la navegación y se reinicia al recargar.

Language Builder, Interpretation Studio y Experiments siguen deshabilitados e identificados como futuros. La configuración visual ya funciona. No hay backend ni persistencia remota. Las fuentes de Google son opcionales: existen alternativas del sistema si no hay conexión.

Consulta [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [ROADMAP.md](ROADMAP.md) y [PHASE_1_5_REPORT.md](PHASE_1_5_REPORT.md). El informe de fase 1 se conserva como registro histórico.
