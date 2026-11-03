# Parte VII · Checklist y referencias

[← Parte VI: Buenas prácticas](./06-buenas-practicas.md) · [Índice](../ESTUDIO.md)

---

## 36. Checklist de antipatrones

Revisa esta lista **antes de pedir una evaluación**. Cada punto enlaza a la sección donde se explica.

### Estado y efectos
- [ ] ¿Algún `useState` guarda algo que se puede calcular? → [§4](./02-fundamentos-react.md#4-estado)
- [ ] ¿Algún `useEffect` sincroniza estado con estado, sin un sistema externo? → [§5](./02-fundamentos-react.md#5-efectos-y-datos-asíncronos)
- [ ] ¿Algún efecto con I/O no tiene cleanup ni protección contra condiciones de carrera? → [§5](./02-fundamentos-react.md#5-efectos-y-datos-asíncronos)
- [ ] ¿Hay booleanos que representan estados mutuamente excluyentes? → [§2.3](./01-principios.md#23-haz-imposibles-los-estados-imposibles)
- [ ] ¿Se muta estado o props (`push`, `sort` o `splice` sobre el original)? → [§4](./02-fundamentos-react.md#4-estado)
- [ ] ¿El reducer tiene efectos secundarios (storage, fechas, ids aleatorios)? → [§7](./02-fundamentos-react.md#7-usereducer--context-provider-pattern)

### Componentes
- [ ] ¿Algún `key` usa el índice en una lista dinámica? → [§3](./02-fundamentos-react.md#3-componentes-y-props)
- [ ] ¿Algún componente pide datos, transforma y pinta a la vez (SRP)? → [§1.1](./01-principios.md#11-srp-single-responsibility-responsabilidad-única)
- [ ] ¿Muchas props booleanas de configuración donde cabría composición (OCP)? → [§1.2](./01-principios.md#12-ocp-openclosed-abiertocerrado)
- [ ] ¿Algún wrapper de un elemento nativo rompe su contrato (LSP)? → [§1.3](./01-principios.md#13-lsp-liskov-substitution-sustitución-de-liskov)
- [ ] ¿Algún componente recibe un objeto completo pero usa uno o dos campos (ISP)? → [§1.4](./01-principios.md#14-isp-interface-segregation-segregación-de-interfaces)
- [ ] ¿Un componente reutilizable soporta solo un modo (controlado o no controlado) sin motivo? → [§13](./03-patrones-componentes.md#13-controlado--no-controlado)
- [ ] ¿Un compound component falla en silencio fuera de su raíz? → [§10](./03-patrones-componentes.md#10-compound-components)

### Arquitectura
- [ ] ¿Hay `fetch` o `localStorage` dentro de componentes o hooks de UI (DIP)? → [§1.5](./01-principios.md#15-dip-dependency-inversion-inversión-de-dependencias)
- [ ] ¿Algún import cruza la frontera de una feature sin pasar por su `index.ts`? → [§24](./05-arquitectura.md#24-feature-first)
- [ ] ¿Algún archivo de una feature importa su propio barrel? → [§25](./05-arquitectura.md#25-barrel-files)
- [ ] ¿Algo en `shared/` conoce el dominio? → [§24](./05-arquitectura.md#24-feature-first)
- [ ] ¿Hay lógica de negocio duplicada en varios lugares (DRY)? → [§2.1](./01-principios.md#21-dry-vs-aha)
- [ ] ¿Algún hook de contexto devuelve `undefined` en silencio fuera de su provider? → [§2.6](./01-principios.md#26-fail-fast)
- [ ] ¿Hay singletons mutables importados desde cualquier lado? → [§23](./04-patrones-diseno.md#23-singleton-y-por-qué-evitarlo)
- [ ] ¿Hay abstracciones (capas, interfaces, contextos) sin un segundo uso real ni previsible (YAGNI)? → [§2.2](./01-principios.md#22-kiss-y-yagni)

### TypeScript
- [ ] ¿Algún `any`, `as Tipo` o `// @ts-ignore`? → [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)
- [ ] ¿Variantes tipadas como `string` en lugar de uniones? → [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)
- [ ] ¿Datos externos (JSON, storage, API) usados sin validación? → [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)
- [ ] ¿Un `switch` sobre una unión sin verificación de exhaustividad? → [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)

### Accesibilidad y calidad
- [ ] ¿Algún `<div onClick>` que debería ser `<button>`? → [§33](./06-buenas-practicas.md#33-accesibilidad)
- [ ] ¿Algún input sin `label` o botón de ícono sin `aria-label`? → [§33](./06-buenas-practicas.md#33-accesibilidad)
- [ ] ¿Se puede usar todo con el teclado? → [§33](./06-buenas-practicas.md#33-accesibilidad)
- [ ] ¿Nombres poco descriptivos (`data2`, `fn`, `open` para un booleano)? → [§35](./06-buenas-practicas.md#35-convenciones-de-nombres-y-organización)
- [ ] ¿`pnpm build` y `pnpm lint` pasan sin errores ni warnings?

---

## 37. Referencias

### Oficiales
- [react.dev: Aprende React](https://react.dev/learn), la ruta recomendada para retomar React.
- [react.dev: Referencia de API](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Patrones de React
- [Patterns.dev](https://www.patterns.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Kent C. Dodds: Blog](https://kentcdodds.com/blog)
- [TkDodo: Blog](https://tkdodo.eu/blog/all)
- [Martin Fowler: Headless Component](https://martinfowler.com/articles/headless-component.html)
- [Martin Fowler: Modularizing React Applications](https://martinfowler.com/articles/modularizing-react-apps.html)

### Patrones de diseño y arquitectura
- [Refactoring.Guru: Patrones de diseño (en español)](https://refactoring.guru/es/design-patterns)
- [Refactoring.Guru: Code smells y refactorización](https://refactoring.guru/es/refactoring)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Alistair Cockburn: Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Mark Seemann: Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/)

### Libros
- *Clean Code* y *Clean Architecture*, de Robert C. Martin.
- *Refactoring* (2.ª ed.), de Martin Fowler.
- *Design Patterns* (GoF), de Gamma, Helm, Johnson y Vlissides.
- *A Philosophy of Software Design*, de John Ousterhout. Es un buen contrapeso a las abstracciones excesivas.

### Herramientas del proyecto
- [Oxlint: reglas](https://oxc.rs/docs/guide/usage/linter/rules) · [Vite: guía](https://vite.dev/guide/)

---

[← Parte VI: Buenas prácticas](./06-buenas-practicas.md) · [Índice](../ESTUDIO.md)
