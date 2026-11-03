# Semántica de LOGOS

## Lenguaje aceptado

Identificadores: letras Unicode o `_` al inicio, seguidas de letras, números o `_`. Los nombres distinguen mayúsculas. Un mismo nombre no puede declarar simultáneamente función y predicado; las variables ligadas tampoco pueden colisionar con símbolos declarados.

```ebnf
formula      = equivalence ;
equivalence  = implication, { "↔", implication } ;
implication  = disjunction, [ "→", implication ] ;
disjunction  = conjunction, { "∨", conjunction } ;
conjunction  = unary, { "∧", unary } ;
unary        = "¬", unary
             | ("∀" | "∃"), identifier, ["."], unary
             | "(", equivalence, ")"
             | term, "=", term
             | identifier, ["(", [term, {",", term}], ")"] ;
term         = identifier, ["(", [term, {",", term}], ")"] ;
```

Precedencia descendente: negación y cuantificadores, conjunción, disyunción, implicación y bicondicional. ∧, ∨ y ↔ se agrupan a la izquierda; → a la derecha. Un cuantificador abarca solo la fórmula inmediata, igual que ¬ y que la notación del curso (Entornos: `∀x P(x) → ∀x Q(x)` es una implicación entre dos enunciados). Por ello:

- `∀x P(x) → Q(x)` equivale a `(∀x P(x)) → Q(x)` y deja libre la x de Q.
- `∀x (P(x) → Q(x))` liga ambas x.
- `∀x ∃y P(x,y)` admite cuantificadores anidados.
- `∀x. P(x)` admite un punto opcional tras la variable; no cambia el alcance.

## Igualdad y escritura con teclado

`t = s` es una fórmula atómica entre dos términos: es verdadera si y solo si ambos términos valen el mismo elemento de D. Es un símbolo lógico, así que no se declara ni se interpreta. No se encadena (`x = y = z` es un error de sintaxis).

Además de los botones, los símbolos pueden escribirse con el teclado:

| Símbolo | ¬ | ∧ | ∨ | → | ↔ | ∀ | ∃ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Teclado | `~` | `&` | `\|` | `->` | `<->` | `forall` | `exists` |

`forall` y `exists` quedan reservados: no pueden declararse como símbolos ni usarse como variables.

## Términos, dominio y aridades

Un identificador de término sin aplicación es una variable, salvo que esté declarado como función de aridad cero. Una constante c puede escribirse `c` o `c()`. Una función con aridad positiva debe recibir exactamente sus argumentos; los términos pueden anidarse, como `f(g(c), x)`.

Las etiquetas del dominio representan elementos de la interpretación, no constantes implícitas. Si D contiene `a`, usar `P(a)` requiere asignar la variable a o declarar a como constante. Esto evita mezclar el lenguaje formal con su universo.

Cada función de aridad n debe contener exactamente una fila por entrada de Dⁿ y tener su salida en D. Cada relación debe contener al menos una tupla válida de la longitud declarada, según la consigna. Una relación no vacía **no** significa que todo átomo sea verdadero. Las filas duplicadas se rechazan para permitir detectar errores de entrada.

Aridad cero: D⁰ contiene la tupla vacía `()`. Una constante requiere una fila `() -> a`. Un predicado de aridad cero, sujeto a la obligación de relación no vacía, tiene la única interpretación `[[]]` y resulta verdadero. Su negación resulta falsa; una relación ceroaria vacía se rechaza por la consigna.

## Entornos y decisiones

Las variables libres se calculan estructuralmente. Una fórmula abierta requiere una asignación para cada variable libre, incluso si un cortocircuito permitiría decidir sin consultar alguna de ellas. Se rechazan asignaciones fuera del dominio y asignaciones para nombres que no son variables libres. El sombreado de variables ligadas crea un entorno nuevo y no modifica los entornos hermanos.

El dominio se recorre en el orden introducido por el usuario. El universal falso conserva el primer contraejemplo; el existencial verdadero conserva el primer testigo. El universal verdadero y el existencial falso conservan la comprobación de todos los elementos. La conjunción, disyunción e implicación usan cortocircuito cuando es válido, después de validar la fórmula entera. El bicondicional compara ambos operandos.

`Evidence` registra operación, rango de origen, fórmula, entorno, regla, resultado, sustituciones de los términos atómicos, hijos comprobados, casos y razones decisivas. El árbol y su animación se derivan de esta misma evidencia.

## Formato de tablas en la interfaz

Dominio: etiquetas separadas por comas. Relación: una tupla entre paréntesis por línea, por ejemplo `(a, b)`. Función: una fila por línea, por ejemplo `(a, b) -> c`; también se acepta `↦` como separador de la tabla. Este separador no es un alias de conectivo en las fórmulas. La notación de tablas no incluye escape de comas ni saltos de línea dentro de una etiqueta.

## Límites operativos

- 128 elementos de dominio y 128 símbolos por categoría.
- Aridad máxima 8; hasta 20000 filas en total en la interpretación.
- Fórmula de hasta 8192 caracteres y 2048 tokens; presupuesto de anidamiento del parser y profundidad del AST de 128.
- 250000 operaciones de evaluación, incluyendo resolución de términos. Alcanza, por ejemplo, para tres cuantificadores anidados sobre 20 elementos.
- Hasta 100 diagnósticos de validación por pasada.

Estos son límites de la implementación, no cambios a la definición matemática de lógica de primer orden. Una entrada fuera de los límites produce un diagnóstico `resource`; agotar el presupuesto durante la evaluación produce `limit`. Ninguno asigna falso ni emite un valor parcial. La cardinalidad necesaria para una función total se calcula con enteros exactos (BigInt).

La evaluación es local, síncrona y determinista. No hay llamadas a modelos de lenguaje ni a servicios remotos para obtener un resultado.

## Qué dibuja el árbol

El árbol no recalcula nada: cada nodo es una entrada de `Evidence`, en el orden en que el motor la produjo.

- **Árbol completo.** Se dibuja todo lo que el motor evaluó, incluidos los intentos que no decidieron, como `y = a` antes del testigo `y = b`. El botón `−` colapsa una rama y `+N` la vuelve a abrir.
- **Razón decisiva.** El motor marca con `decisive` los hijos de los que depende el valor del padre. Sus ramas se ven más intensas, y el testigo o contraejemplo lleva un anillo y su etiqueta.
- **Lo que no existe no se dibuja.** Un operando omitido por cortocircuito o los casos posteriores a un contraejemplo nunca se evaluaron, así que no tienen nodo.

Hay un máximo de 200 nodos a la vez. Si un resultado no cabe, primero se abre la rama decisiva y el resto queda cerrado con su valor visible; la justificación del Evaluador conserva siempre todos los casos.
