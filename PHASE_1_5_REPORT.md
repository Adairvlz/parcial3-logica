# LOGOS — Informe de fase 1.5

Fecha de cierre: 28 de octubre de 2026, America/Guatemala.

**Estado: implementada y verificada.** La fase 2 no se ha iniciado.

## Cambios implementados

La dirección visual oficial es **Organic Luminous Reasoning Tree**. El workspace se reconstruyó alrededor de un canvas inmersivo, con navegación compacta y editor, inspector y configuración flotantes. La vista inicial muestra el ejemplo completo; Animar reconstruye sus ocho pasos.

Los siete nodos ahora tienen núcleos circulares, iluminación radial, órbitas elípticas, halo, sombra y etiquetas externas. Violeta identifica el universal, azul los existenciales y turquesa los átomos. Un indicador independiente comunica pendiente, en proceso o verdadero; el tipo lógico no cambia de color por su resultado.

Las seis dependencias reales se dibujan como curvas Bézier personalizadas. Crecen del padre al hijo y transportan pulsos de retorno una vez comprobado el testigo. La selección ilumina la ruta de ancestros. La composición asimétrica evita las filas del organigrama anterior, con una variante más estrecha para móvil.

## Funcionamiento y rigor

Se conserva el ejemplo original: `∀x ∃y P(x,y)`, `D = {a,b,c}`, `P = {(a,b),(b,c),(c,a)}`. Los testigos son `b`, `c` y `a`, respectivamente. No se añaden conexiones falsas, ciclos ni intentos de búsqueda inventados.

La reproducción dura 21,6 segundos a velocidad normal: raíz, tres ramas, testigo de a, testigo de b, testigo de c, propagación, conclusión y vista completa. Las duraciones son de presentación de la traza DEMO, no tiempos medidos de un evaluador.

Play, Pause, Restart, Next, Previous, velocidad y slider funcionan sobre un único reloj cancelable. `frameAt(time)` reconstruye cada estado desde el instante absoluto; los saltos rápidos y el retroceso no acumulan mutaciones. La cámara interpola hacia la rama activa y cede ante zoom o desplazamiento manual. Pausar congela el razonamiento y el movimiento automático en curso. El ajuste manual y la selección siguen disponibles.

El inspector consulta el estado temporal: no presenta una conclusión futura como ya demostrada. Editar la fórmula detiene la reproducción y retira el resultado anterior. El escenario sintético de 40 nodos se identifica expresamente como prueba visual, sin valor de verdad. Volver al ejemplo restaura la demostración completa.

## Componentes reutilizados y tecnologías

Se conservaron React, TypeScript estricto, Vite, React Flow, Lucide, el fixture matemático, contratos de dominio/lenguaje, estado de fórmula, inserción en cursor, badges y pruebas de integridad del ejemplo. Inspector, navegación y dashboard se refactorizaron para el nuevo entorno.

SVG y CSS aportan curvas, luz y profundidad 2.5D. No se añadieron dependencias de ejecución ni un motor WebGL. Para las evidencias se instaló FFmpeg de Playwright en `.tools/playwright`, sin instalación global. Grabar vídeo es opcional; las pruebas normales funcionan sin FFmpeg.

## Verificaciones ejecutadas

| Verificación | Resultado final |
| --- | --- |
| `npm run build` | Correcto: TypeScript estricto y producción Vite |
| `npm test` | 16 pruebas aprobadas |
| `npm run test:e2e` | 13 pruebas aprobadas en Edge headless |
| Dependencias | `npm ls --depth=0` sin dependencias faltantes |
| Reproducción completa | Finaliza con los siete nodos verdaderos y resultado justificado |
| Capturas y grabación | Generadas con navegador real |
| Tamaños | 1920×1080, 1366×768, 768×1024 y 390×844 sin desbordamiento horizontal |
| Accesibilidad probada | Selección con teclado, foco modal, controles rotulados y movimiento reducido |
| Escalabilidad exploratoria | 40 nodos, 39 conexiones, layout sin superposición según las comprobaciones geométricas |

Las pruebas cubren pertenencia de testigos, cobertura del universal, ausencia de dependencias añadidas, estados temporales, propagación posterior a verificación, reconstrucción determinista, edición y conservación del cursor, retirada de resultados desactualizados, navegación, reproducción, saltos rápidos, cámara automática/manual, zoom, pan, ajuste, inspector, diálogos y retorno desde la escena sintética.

La revisión detectó y corrigió conflictos entre cancelación de cámara, saltos de timeline y cambios de escena. La falta de FFmpeg que interrumpió la ejecución anterior quedó resuelta. La captura del inspector se realiza después de su transición de entrada para mostrar su estado estable.

## Rendimiento observado

En una muestra de tres segundos durante la reproducción a 2×, el navegador registró 403 callbacks de `requestAnimationFrame`: mediana de 7,0 ms y percentil 95 de 13,9 ms entre callbacks. Es una observación local de cadencia en Edge headless, **no una garantía de FPS de renderizado**, ni una medición para otros equipos. El estado visual se publica aproximadamente a 30 Hz.

La escena limita los puntos ambientales a 38 y los pulsos a uno por conexión activa. El caso sintético reduce filtros y activa renderizado por visibilidad. La comprobación de 40 nodos no sustituye pruebas futuras con cientos de nodos ni trazas arbitrarias.

## Evidencias visuales

- [Vista de escritorio](docs/phase-1-5/desktop.png).
- [Inspector contextual](docs/phase-1-5/inspector.png).
- [Vista móvil](docs/phase-1-5/mobile.png).
- [Crecimiento de ramas](docs/phase-1-5/growing.png).
- [Evaluación de un testigo](docs/phase-1-5/witness.png).
- [Escenario sintético de 40 nodos](docs/phase-1-5/synthetic-40.png).
- [Grabación de la demostración completa](docs/phase-1-5/demonstration.webm).
- [Medición local de cadencia](docs/phase-1-5/frame-cadence.json).

Se inspeccionaron las capturas de escritorio, inspector, móvil y pasos intermedios. La grabación permite reproducir el comportamiento continuo; no se afirma una auditoría de cada fotograma del vídeo.

## Limitaciones y preparación siguiente

- Solo se presenta la demostración predefinida. No hay parser, evaluador semántico general ni generación arbitraria de trazas.
- El layout del ejemplo está diseñado para siete nodos; el layout sintético es una prueba separada de geometría.
- Agrupación, contracción de subárboles y optimización para cientos de nodos quedan pendientes.
- No se verificaron Firefox, Safari ni lectores de pantalla reales. Las fuentes personalizadas tienen alternativas del sistema.
- Los ajustes y el borrador viven en memoria y se reinician al recargar.
- El modo inmersivo amplía el canvas dentro de la ventana; no exige la API de pantalla completa del navegador.

Los datos matemáticos, la presentación temporal, el reloj, la geometría y el renderer están separados. Las fases 2 y 3 podrán aportar evaluaciones y eventos reales sin volver a construir la experiencia visual. README, arquitectura, sistema de diseño y roadmap quedaron actualizados; el informe de fase 1 se conserva como registro histórico.
