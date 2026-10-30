# LOGOS · Organic Luminous Reasoning Tree

## Dirección definitiva

Un árbol matemáticamente jerárquico con apariencia orgánica: núcleos circulares suspendidos, ramas Bézier, halos y profundidad 2.5D. El canvas define la composición. No se dibujan conexiones decorativas entre nodos; cada arista corresponde a una dependencia del fixture.

Tres capas: atmósfera tenue, estructura lógica luminosa e interfaz contextual flotante. La barra superior mide 60 px y la navegación 60 px; el modo inmersivo retira ambas. Editor, inspector, configuración y menú son superpuestos y ocultables. El área de canvas ocupa aproximadamente el 89 % de una pantalla de 1366×768 en modo normal y el 100 % en modo inmersivo, con controles superpuestos.

## Colores y significado

| Elemento    | Color     | Significado                             |
| ----------- | --------- | --------------------------------------- |
| Espacio     | `#050a14` | Fondo profundo                          |
| Núcleo ∀    | `#c1a8ff` | Cuantificador universal                 |
| Núcleo ∃    | `#76c6ff` | Cuantificador existencial               |
| Núcleo P    | `#6fead5` | Predicado atómico                       |
| Indicador ✓ | `#a5ffe0` | Verdadero                               |
| Indicador ○ | `#9db4c9` | Pendiente                               |
| Indicador · | `#f8d799` | En proceso                              |
| Indicador × | `#ffb6ba` | Falso, preparado para trazas futuras    |
| Indicador ! | `#ffde9b` | Error, preparado para validación futura |

El tipo de operación nunca se reemplaza por el color de verdad: un universal verdadero sigue teniendo núcleo violeta y añade un indicador verde. Los estados también tienen símbolo y nombre accesible. Selección y estado son independientes.

## Núcleos y ramas

Gradiente radial asimétrico, brillo especular, borde fino, dos órbitas elípticas, halo y sombra proyectada crean volumen sin perspectiva que deforme la fórmula. Las etiquetas flotan fuera del núcleo. El símbolo principal permanece visible; asignaciones y texto secundario aparecen con hover, foco, selección o zoom.

Las ramas crecen del padre al hijo con `stroke-dashoffset`. Un pulso se desplaza por la misma Bézier. Tras comprobar un átomo, el pulso regresa al existencial; después, las tres ramas verdaderas regresan a la raíz. La selección ilumina solo los ancestros y atenúa las demás ramas.

La disposición evita filas uniformes, cruces innecesarios y conexiones a través de las etiquetas centrales. Desktop y móvil usan composiciones distintas de los mismos siete nodos. Un layout por intervalos prueba 40 nodos sintéticos sin resultado matemático.

## Tiempo y cámara

Secuencia de 21,6 s a velocidad normal: raíz, tres ramas, testigos de a/b/c, retorno de resultados, conclusión y encuadre completo. No se añaden destellos sin significado. Las interpolaciones se calculan desde el tiempo, por lo que pueden pausarse o reconstruirse.

La cámara interpola en 950 ms hacia la región activa y encuadra todo al final. Pan/zoom manual desactiva el seguimiento. Hay controles para ajustar, centrar la selección y volver a activar el seguimiento. La perspectiva de fondo es ambiental y no modifica las coordenadas matemáticas.

## Tipografía y controles

DM Sans para interfaz, JetBrains Mono para fórmulas/tiempo y Georgia para símbolos grandes y reglas. Se conservan fuentes de sistema. El tamaño óptico de las etiquetas compensa parcialmente el zoom lejano. Paneles translúcidos de 8–12 px de radio con bordes discretos; la interfaz permanece menos luminosa que el árbol.

Timeline inferior con ocho hitos, slider, reproducción, pausa, pasos, reinicio y velocidad. El estado inicial es una vista completa explorable. El botón Animar inicia la reconstrucción desde el inicio si se llegó al final; desde pausa continúa.

## Accesibilidad y adaptación

Nodos seleccionables por Tab + Enter/Espacio, nombres accesibles para controles, inspector con estado temporal real, diálogo con foco confinado y Escape, enlace de salto al árbol. Movimiento reducido del sistema o control explícito elimina pulsos, escalas interpoladas, desplazamiento ambiental y transiciones de cámara sin cambiar el orden de resultados.

En pantallas pequeñas, el árbol usa composición más estrecha, la timeline ocupa el ancho y los paneles tienen scroll interno. Se puede hacer zoom y centrar un nodo para leer; la vista global de 40 nodos es estructural, no de lectura de etiquetas. No se afirma auditoría formal de contraste ni pruebas con lectores de pantalla reales.

## Vista de evaluación real · fase 2

El acceso Evaluar abre una vista de trabajo diferenciada del canvas DEMO. Reutiliza la paleta oscura, la notación monoespaciada y la botonera de fórmulas; agrupa dominio, declaraciones y tablas en un formulario. La evidencia aparece a la derecha en escritorio y debajo en móvil. Al evaluar se encuadra el resultado o la sección de asignaciones pendientes.

`MOTOR REAL` identifica un valor calculado. Verde significa verdadero, coral falso, y ámbar corresponde a entrada inválida o cálculo pendiente, sin valor de verdad. Las filas desplegables muestran V/F, fórmula y entorno; al abrirlas revelan la regla, los casos comprobados, sustituciones y razones decisivas. Cada edición elimina el resultado anterior. Los errores de fórmula permiten seleccionar su posición exacta en el editor.

El modelo editable tiene su propio estado; no cambia la interpretación del ejemplo animado. Al volver se indica explícitamente Árbol DEMO. La edición gráfica avanzada de interpretaciones y la visualización de trazas arbitrarias siguen en fases posteriores.
