# LOGOS — Informe de fase 3

Estado: implementada y verificada. Incluye la reproducción prevista para la fase 4.

## Resultado

El árbol dejó de ser un ejemplo escrito a mano: se genera a partir de la evidencia del motor para cualquier fórmula, con ¬, ∧, ∨, →, ↔, ∀, ∃ e igualdad, y con resultados verdaderos y falsos. La app abre con el ejemplo ya evaluado. **Ver razonamiento en el árbol** lo abre y lo reproduce.

- `src/reasoning/tree.ts` decide qué se dibuja: todo lo que el motor evaluó, con un máximo de 200 nodos y ramas que se colapsan.
- `src/reasoning/playback.ts` compila la reproducción desde ese árbol, en el orden del motor.
- Testigos y contraejemplos se resaltan en el nodo; el inspector muestra regla, entorno, términos y explicación del motor.

Se retiraron el fixture de siete nodos, su secuencia escrita a mano y las composiciones fijas. Se conserva toda la experiencia visual sobre datos reales.

## Decisión de diseño

El árbol se muestra completo por defecto, porque las fórmulas previstas son pequeñas. Si un resultado supera los 200 nodos, se prioriza la rama decisiva y el resto queda cerrado; la justificación del Evaluador conserva todos los casos. Detalle en [SEMANTICS.md](SEMANTICS.md).

## Limitaciones

- Máximo de 200 nodos a la vez en el árbol; lo que no cabe se avisa y sigue disponible en el Evaluador.
- Las pruebas de navegador se ejecutaron con Chrome; no se verificaron Firefox, Safari ni lectores de pantalla reales.
