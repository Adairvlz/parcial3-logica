# Informe de fase 1

Fecha: 27 de octubre de 2026, America/Guatemala.

## Entrega

Implementada **Foundation & Visual Experience** en un repositorio inicialmente vacío. Se conservó el alcance de fase 1: no se implementó parser, evaluación arbitraria, reproducción simulada ni generación de trazas reales.

- React + TypeScript estricto + Vite con dependencias bloqueadas por `package-lock.json`.
- Dashboard, shell, navegación real con historial y módulos futuros deshabilitados.
- Identidad LOGOS, interfaz oscura, fuentes matemáticas, iconografía y estados visuales coherentes.
- Editor compartido entre rutas, botones de símbolos, selección/reemplazo y restauración del ejemplo.
- Árbol estructurado de siete nodos con zoom, pan, escala original, ajuste, reencuadre responsive y selección por ratón/teclado.
- Ruta resaltada e inspector con entornos, reglas, justificaciones y testigos.
- DEMO explícita, sin resultados desactualizados al cambiar el texto.
- Diálogo accesible de ejemplos/ayuda, gestión del foco, Escape, controles rotulados y movimiento reducido.
- Documentación README, arquitectura, diseño y roadmap con plan concreto de fase 2.

## Correctitud del ejemplo

Para `D = {a,b,c}` y `P = {(a,b),(b,c),(c,a)}`, `∀x ∃y P(x,y)` es verdadera. Los testigos son respectivamente `b`, `c` y `a`. La raíz incluye todos los casos del universal. Cada existencial presenta un testigo suficiente; no afirma haber explorado otras tuplas ni muestra una búsqueda ficticia. Los datos son un fixture authored, identificado mediante `source: 'demo'`.

## Verificaciones ejecutadas

| Verificación                                    | Resultado                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run build`                                 | Correcto; TypeScript estricto y compilación de producción               |
| `npm test`                                      | 6 pruebas aprobadas con Vitest 4.1.12                                   |
| `npm run test:e2e`                              | 8 pruebas aprobadas en Edge headless con Playwright                     |
| Auditoría de instalación tras actualizar Vitest | 0 vulnerabilidades reportadas                                           |
| Errores JavaScript durante capturas             | Ninguno                                                                 |
| Adaptación                                      | Sin desbordamiento horizontal a 1920×1080, 1366×768, 768×1024 y 390×844 |
| Movimiento reducido                             | Animaciones de nodos desactivadas según preferencia                     |

Las pruebas unitarias verifican cobertura de todos los elementos del dominio, validez de los testigos, pertenencia de tuplas, conectividad, rutas y edición en cursor/selección.

Las pruebas end-to-end verifican navegación e historial, selección e inspector, ruta de ancestros, inserción y foco, conservación del borrador entre rutas, retirada del resultado, restauración, zoom/pan/ajuste, ocultación del inspector, diálogo modal, teclado, tamaños de pantalla y ausencia de errores de ejecución.

La primera ejecución detectó un nombre accesible incompleto y un problema de selección con teclado. Una prueba adicional detectó salida del foco del diálogo. Se corrigieron y la suite final pasó completa. La revisión visual detectó que el canvas no se reencuadraba al cambiar de tamaño; se implementó y comprobó el ajuste automático.

## Revisión visual

Se inspeccionaron capturas reales del dashboard y del laboratorio de escritorio, además del laboratorio móvil. Playwright genera los archivos locales ignorados por Git:

- `test-results/dashboard-1366.png`
- `test-results/laboratory-1366.png`
- `test-results/laboratory-mobile.png`

La UI emplea paneles compactos, jerarquía tipográfica, conexiones diferenciadas, selección luminosa moderada y un inspector que pasa debajo en pantallas menores. En móvil el árbol se ajusta completo a la anchura y se amplía mediante controles para leer los detalles.

## Decisiones y límites

- CSS con variables y animaciones nativas; Tailwind y Motion no son necesarios para esta fase.
- React Flow resuelve interacción espacial; no se generan imágenes para representar nodos.
- Estado en un hook de React, sin store global adicional, backend ni persistencia en recarga.
- Layout fijo exclusivamente para el escenario de siete nodos; layout arbitrario pendiente de fase 3.
- No se implementó expandir/contraer: era opcional y la demostración es suficientemente pequeña para mostrarla completa.
- Las rutas editor y laboratorio comparten la composición y el borrador; el editor no analiza sintaxis.
- La comprobación del ejemplo exige igualdad textual exacta. Incluso cambios de espacios suspenden su resultado.
- Google Fonts requiere conexión para fuentes personalizadas; hay fuentes de respaldo.
- Pruebas en Edge; no se afirma validación en Firefox, Safari ni con lectores de pantalla reales.
- No se publicó ni desplegó: la entrega solicitada es el repositorio local.

El entorno no tenía Node.js en PATH. Se preparó Node 22.22.0 portátil dentro de `.tools/`. npm 10 presentó un error interno al actualizar Vitest; npm 11.6.2 completó la actualización. Las instrucciones normales usan `npm ci` con el lockfile final.

## Preparación de fase 2

Contratos separados de lenguaje, dominio, funciones, interpretación, asignaciones, validación y trazas. `core/` queda como ubicación del motor puro; `reasoning/` para justificaciones y eventos; `visualization/` transforma esos datos en componentes. El roadmap detalla gramática, totalización de funciones, relaciones no vacías, alcance y variables libres, resultados discriminados y pruebas matemáticas.

**La implementación se detiene aquí; no se inició la fase 2.**
