# Reto #2: Librería "Página Abierta" (de Principiante a Avanzado)

> Reto progresivo para retomar React. Cada nivel se construye **sobre el anterior** dentro de la misma app.
> **Ejecutar:** `pnpm --filter reto-02 dev` desde la raíz, o `pnpm dev` dentro de esta carpeta. El código va en `src/` de esta carpeta, y las evaluaciones en `revisiones/`.
> No pases al siguiente nivel hasta cumplir los criterios de aceptación del actual.
> Para la teoría de cada nivel, consulta [`ESTUDIO.md`](../../ESTUDIO.md). Cada nivel indica qué secciones leer.

---

## Problema de negocio

**Página Abierta** es una librería de barrio que quiere vender en línea. Necesitan una web sencilla donde el cliente pueda:

1. Ver el catálogo de libros.
2. Buscar, filtrar por categoría y ordenar.
3. Ver el detalle de un libro.
4. Agregar libros a un carrito que no se pierda al recargar la página.

El backend todavía no existe. Vas a trabajar con un **servicio simulado** que devuelve datos locales con latencia y, de vez en cuando, falla. Así practicas estados de carga y de error reales.

### Datos de partida

Crea un archivo de datos con **al menos 12 libros**. Cada libro tiene:
- identificador
- título
- autor
- precio
- categoría (Novela, Ciencia, Historia o Infantil)
- URL de portada (puede ser un placeholder)
- descripción
- stock disponible
- calificación promedio (1 a 5)

Incluye al menos un libro con **stock 0**.

---

## Estructura objetivo

Esta es la estructura a la que debes llegar al terminar el Nivel 5. Puedes crearla desde el inicio, aunque los `index.ts` (barrels) son obligatorios recién en el Nivel 5.

```
src/
├── app/
│   └── App.tsx                         # Ensambla providers y páginas
├── shared/
│   ├── ui/
│   │   ├── button/                     # Button reutilizable
│   │   ├── badge/                      # Etiqueta de categoría / "Agotado"
│   │   ├── card/                       # Contenedor con composición por children
│   │   ├── rating/                     # Estrellas de calificación
│   │   ├── tabs/                       # Compound Component (Nivel 5)
│   │   └── index.ts                    # Barrel de la UI compartida
│   ├── hooks/
│   │   ├── use-debounced-value.ts
│   │   ├── use-local-storage.ts
│   │   └── index.ts
│   └── lib/
│       └── format-currency.ts
└── features/
    ├── catalog/
    │   ├── data/                       # Datos mock + servicio simulado
    │   ├── types/                      # Tipos del dominio "libro"
    │   ├── hooks/                      # use-books, use-book-filters
    │   ├── components/                 # BookCard, BookList, CatalogToolbar, BookDetail...
    │   └── index.ts                    # Barrel público de la feature
    └── cart/
        ├── types/                      # Tipos del carrito y de sus acciones
        ├── state/                      # Reducer + contexto + provider
        ├── hooks/                      # use-cart
        ├── components/                 # CartSummary, CartItem, AddToCartButton...
        └── index.ts                    # Barrel público de la feature
```

> El `src/` de esta carpeta parte del scaffold de Vite (`App.tsx` y `main.tsx` de ejemplo). En el Nivel 1, reemplaza la página de demo y mueve `App.tsx` a `src/app/`.

---

## Nivel 1 · Componentes y Props (Principiante)

**Guía:** secciones 3 y 30 (y SOLID: 1.2 OCP, 1.4 ISP).

### Escenario
El dueño quiere ver los libros en una grilla. Todavía no hace falta interacción.

### Requisitos
- **`Button`** reutilizable:
  - Variantes visuales (`primary`, `secondary`, `ghost`) y tamaños (`sm`, `md`). Ambos se tipan como uniones de literales, no como `string`.
  - Acepta **todas las props nativas** de un `<button>` (`onClick`, `disabled`, `type`, `aria-*`) sin que tengas que declararlas una por una.
  - Recibe `ref` como prop, al estilo de React 19, sin `forwardRef`.
- **`Card`**: contenedor genérico que se compone con `children`. No sabe nada de libros.
- **`Badge`**: muestra la categoría. Tiene una variante de alerta para "Agotado".
- **`Rating`**: muestra de 1 a 5 estrellas a partir de un número.
- **`BookCard`**: usa `Card`, `Badge`, `Rating` y `Button` para mostrar un libro. Si el stock es 0, el botón "Agregar" se ve deshabilitado.
- **`BookList`**: recibe un arreglo de libros y renderiza la grilla con `key` correctas.
- Formatea los precios con un helper en `shared/lib`, sin repetir la lógica en cada componente.

### Criterios de aceptación
1. `Button` acepta cualquier prop nativa de `<button>` y TypeScript marca error si se pasa una variante inexistente.
2. `Card`, `Badge`, `Button` y `Rating` no importan nada de `features/`, porque son genéricos.
3. Ningún `key` usa el índice del arreglo.

### Pregunta de reflexión
¿Por qué conviene que `Card` reciba `children` en lugar de props como `title`, `image` y `footer`? ¿Qué pasa con esa API cuando aparece un caso nuevo?

---

## Nivel 2 · Estado e Interacción (Principiante → Intermedio)

**Guía:** secciones 4 y 13.

### Escenario
Los clientes no encuentran los libros. Necesitan buscar, filtrar y ordenar.

### Requisitos
- **`CatalogToolbar`** con:
  - Input de búsqueda **controlado**, que busca por título o autor sin distinguir mayúsculas.
  - Selector de categoría, con la opción "Todas".
  - Selector de orden: precio ascendente, precio descendente y mejor calificados.
  - Checkbox "Solo disponibles", que oculta los libros sin stock.
  - Botón "Limpiar filtros".
- El estado de los filtros vive en **un solo lugar** (el componente padre común) y baja por props (*lifting state up*).
- La lista visible es **estado derivado**: se calcula en el render a partir de los libros y los filtros, no se guarda en otro `useState`.
- Muestra un mensaje cuando ningún libro coincide, junto con un contador del tipo "Mostrando X de Y libros".

### Criterios de aceptación
1. No existe ningún `useState` que guarde la lista filtrada, ni un `useEffect` que la sincronice.
2. "Limpiar filtros" deja todos los controles en su valor inicial con **una sola** actualización de estado.
3. Ordenar no muta el arreglo original de libros. Al volver a "sin orden" aparece el orden original.

### Pregunta de reflexión
Si guardaras la lista filtrada en su propio estado, ¿qué bug podría aparecer cuando cambie la lista original de libros?

---

## Nivel 3 · Efectos, Datos Asíncronos y Custom Hooks (Intermedio)

**Guía:** secciones 5, 6 y 8 (y 1.1 SRP).

### Escenario
Los libros ya no vienen de un import directo, sino de un "servidor".

### Requisitos
- **Servicio simulado** en `features/catalog/data/`:
  - Una función que devuelve los libros con una latencia aleatoria de 300 a 1200 ms.
  - Falla aproximadamente el 20 % de las veces con un error descriptivo.
  - Una función que devuelve un libro por id.
- **`useBooks`**: hook que pide los libros y expone el estado como **unión discriminada** (`idle`, `loading`, `success` o `error`). Nunca usa booleanos sueltos como `isLoading` e `isError`.
  - Expone una forma de **reintentar**.
  - Ignora respuestas obsoletas cuando el componente se desmonta o se vuelve a pedir, usando el cleanup del efecto.
- **`useDebouncedValue`** (en `shared/hooks`): la búsqueda se aplica 300 ms después de que el usuario deja de escribir.
- **`useBookFilters`**: mueve toda la lógica de filtros del Nivel 2 a un hook. El componente de página queda como **contenedor** (obtiene datos y estado) y `BookList` y `CatalogToolbar` quedan como **presentacionales** (solo reciben props).
- La UI muestra un *skeleton* o spinner mientras carga, y un mensaje de error con botón "Reintentar" si falla.

### Criterios de aceptación
1. Es imposible representar a la vez "cargando" y "error", porque el tipo no lo permite.
2. `BookList` y `CatalogToolbar` no tienen `useEffect` ni llaman al servicio.
3. Si escribes rápido en el buscador, la lógica de filtrado se ejecuta una sola vez al terminar. Compruébalo con un `console.log` temporal.

### Pregunta de reflexión
El debounce del buscador, ¿es un caso legítimo de `useEffect`? ¿Con qué "sistema externo" estás sincronizando?

---

## Nivel 4 · Estado Global con `useReducer` + Context (Intermedio → Avanzado)

**Guía:** secciones 7 y 20.

### Escenario
Llega el carrito de compras. Varias partes de la app lo necesitan: el botón "Agregar" de cada tarjeta, un contador en el header y un panel de resumen.

### Requisitos
- **Reducer del carrito** con acciones tipadas como unión discriminada:
  - agregar
  - quitar
  - incrementar
  - decrementar
  - vaciar
- **Reglas de negocio dentro del reducer**, no en los componentes:
  - No se puede superar el stock del libro.
  - Decrementar a 0 elimina el ítem.
  - Agregar un libro que ya está incrementa su cantidad.
- **`CartProvider`** + **`useCart`**: el hook lanza un error claro si se usa fuera del provider.
- Totales derivados: cantidad de ítems, subtotal y envío (gratis desde $50; si no, $5) y total. Se calculan, no se guardan.
- **`useLocalStorage`** (en `shared/hooks`): el carrito persiste entre recargas.
- Componentes: `AddToCartButton`, `CartBadge` para el header, `CartSummary` y `CartItem`.

### Criterios de aceptación
1. El reducer es una **función pura**: no usa `localStorage`, no llama a `Date.now()` ni muta el estado anterior.
2. Ningún componente calcula el subtotal ni valida el stock por su cuenta. Esa lógica vive en un solo lugar.
3. Al recargar, el carrito se mantiene. Si `localStorage` tiene datos corruptos, la app arranca con el carrito vacío en vez de romperse.

### Pregunta de reflexión
¿Qué ventaja tiene que `AddToCartButton` despache una acción ("agregar este libro") en vez de recibir el nuevo arreglo del carrito ya calculado?

---

## Nivel 5 · Compound Components y Arquitectura Feature-First (Avanzado)

**Guía:** secciones 10, 24 y 25 (bonus: 11, 22 y 27).

### Escenario
La página de detalle de un libro necesita pestañas ("Descripción", "Detalles", "Reseñas"). Además, el equipo crece, y hay que poner límites claros entre las features.

### Requisitos
- **`Tabs` como Compound Component** en `shared/ui/tabs/`:
  - Se usa como un namespace con partes: raíz, lista de pestañas, pestaña y panel.
  - El consumidor decide el orden y el contenido de cada parte.
  - Funciona en modo **no controlado** (pestaña inicial por defecto) y **controlado** (valor y callback de cambio).
  - Accesible: roles `tablist`, `tab` y `tabpanel`, `aria-selected`, `aria-controls`, y navegación con flechas ← →.
  - Usar una parte fuera de la raíz lanza un error descriptivo.
- **`BookDetail`**: usa `Tabs` para mostrar el libro seleccionado. Basta con un estado de "libro seleccionado" en vez de un router.
- **Barrels**:
  - `features/catalog/index.ts`, `features/cart/index.ts`, `shared/ui/index.ts` y `shared/hooks/index.ts`.
  - Cada barrel exporta **solo la API pública**. Los contextos, el reducer y los helpers internos no se exportan.
- **Reglas de dependencia**:
  - `shared/` nunca importa de `features/`.
  - Una feature no importa archivos internos de otra feature, solo su `index.ts`.
  - `app/App.tsx` importa únicamente desde barrels.
- **Bonus (puente al Reto #1):**
  - Haz que `Button` sea **polimórfico** (prop `as`), para que pueda renderizarse como `<a>` con las props de un enlace bien tipadas.
  - Haz que `useBooks` dependa de un **contrato** de servicio en lugar de la implementación concreta.

### Criterios de aceptación
1. Dos usos distintos de `Tabs` funcionan: uno no controlado en `BookDetail` y otro controlado en cualquier otro lugar, por ejemplo una pestaña "Carrito / Favoritos".
2. Al buscar rutas internas en `App.tsx` (como `/components/`, `/state/` o `/hooks/` de una feature), no aparece ninguna. Tampoco hay imports de `features/` dentro de `shared/`.
3. `pnpm build` y `pnpm lint` pasan sin errores ni warnings.

### Pregunta de reflexión
¿Qué problema resuelve el Compound Component que no resolvería un `Tabs` con una prop `items` (arreglo de `{ label, content }`)? ¿En qué caso la prop `items` sería la mejor opción?

---

## Reglas generales (todos los niveles)

- TypeScript estricto: sin `any` y sin `as Type` para callar errores.
- Sin `enum` (el proyecto tiene `erasableSyntaxOnly`). Usa uniones de literales.
- `import type` para importar solo tipos.
- Cada nivel termina con `pnpm build` y `pnpm lint` en verde (dentro de esta carpeta, o `pnpm --filter reto-02 build` desde la raíz).
- Al terminar cada nivel, pide la evaluación. Se usará el formato de feedback del `CLAUDE.md`.
