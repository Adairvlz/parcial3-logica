# LOGOS — Fase 4: Cinematic Reasoning

Fecha: 3 de noviembre de 2026.

## Revisión breve de fase 3

Se confirmó la conexión entre evidencia del evaluador, árbol visible, distribución orgánica e inspector. Las pruebas existentes cubren fórmulas verdaderas y falsas, testigos, contraejemplos y plegado. El compañero ya había implementado la base de reproducción, con reloj, cámara, crecimiento de ramas y pulsos. Esta fase completa esa base.

## Cambios

- Cada evento identifica entrada, resolución o conclusión y el nodo al que corresponde. Las decisiones distinguen testigo, contraejemplo, comprobación completa, cortocircuito y resumen de ramas plegadas.
- **Ir a una decisión** permite saltar a los pasos decisivos o a la conclusión y deja la reproducción pausada. Las opciones no anticipan el valor de verdad.
- **Seguir razonamiento** recupera o desactiva la cámara automática. Las transiciones se ajustan a la velocidad; mover la cámara manualmente sigue cancelando el seguimiento.
- **Movimiento reducido** permite desactivar desplazamientos y pulsos desde el árbol. La preferencia del sistema se mantiene prioritaria.
- Las conexiones muestran colores de verdad y énfasis decisivo únicamente después de resolver el hijo. Retroceder restaura su estado neutral.
- Las explicaciones avisan cuando resumen ramas plegadas e incluyen los cortocircuitos del motor.
- Se corrigió el reinicio durante una reproducción activa: pulsar Animar otra vez sustituye el reloj cancelado y continúa avanzando.
- Se ajustó el encuadre y la ubicación de controles móviles para mantener libres el árbol y la línea de tiempo.

## Comprobación

Compilación de producción, 91 pruebas unitarias y 24 pruebas de navegador aprobadas. Se añadieron pruebas de eventos y resúmenes, además de flujos de navegador para reinicio activo, decisiones, cámara, movimiento reducido y colores al retroceder. La verificación de navegador incluye las regresiones del evaluador y del árbol en Microsoft Edge. `git diff --check` no encontró errores de espacios.

Capturas revisadas: [escritorio](docs/phase-4/cinematic-desktop.png) y [móvil](docs/phase-4/cinematic-mobile.png).

## Límites

La animación reproduce evidencia ya calculada; su duración es de presentación. Conserva el límite existente de 200 nodos visibles y la cámara panorámica para árboles de más de 15 nodos. Plegar una rama recompila la secuencia y muestra el árbol resuelto; puede animarse de nuevo. No se inició la fase 5 ni se modificó la semántica matemática implementada por el compañero.
