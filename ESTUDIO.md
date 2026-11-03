# Centro de Estudio: Principios, Patrones y Arquitectura en React

> Mi documentación de referencia para pasar de Junior a Senior en React + TypeScript.
> Proyecto: React 19 · TypeScript 7 · Vite 8. Retos en [`retos/`](./retos/): cada uno tiene su `ENUNCIADO.md`, su `src/` y sus `revisiones/`.

## Cómo usar esta guía

- **Cada sección tiene:** ideas clave, **2 a 4 ejemplos** (normalmente ❌ Antes → ✅ Después → 💡 Por qué), un ejercicio 🏋️ y enlaces para profundizar.
- **Política de ejemplos:**
  - Los ejemplos usan dominios **distintos** a los de los retos (usuarios, notas, notificaciones, cursos…).
  - En los patrones que evalúan los retos, se enseña la mecánica completa, pero las piezas exactas que pide cada reto quedan marcadas como 🧩 **ejercicio**.
  - La guía enseña cómo funciona cada patrón, pero no resuelve los retos.
- **Imports:** se omiten los de React (`useState`, `ReactNode`…) salvo cuando importan para la idea.

## Ruta de estudio sugerida (alineada con el [RETO-02](./retos/reto-02-libreria/ENUNCIADO.md))

| Nivel del reto | Lee primero | Refuerza con |
|---|---|---|
| 1 · Componentes y props | [§3](./guia/02-fundamentos-react.md#3-componentes-y-props), [§30](./guia/06-buenas-practicas.md#30-typescript-aplicado-a-react) | [§1.2 OCP](./guia/01-principios.md#12-ocp-openclosed-abiertocerrado), [§1.3 LSP](./guia/01-principios.md#13-lsp-liskov-substitution-sustitución-de-liskov), [§1.4 ISP](./guia/01-principios.md#14-isp-interface-segregation-segregación-de-interfaces) |
| 2 · Estado e interacción | [§4](./guia/02-fundamentos-react.md#4-estado), [§13](./guia/03-patrones-componentes.md#13-controlado--no-controlado) | [§2.3 Estados imposibles](./guia/01-principios.md#23-haz-imposibles-los-estados-imposibles) |
| 3 · Efectos y custom hooks | [§5](./guia/02-fundamentos-react.md#5-efectos-y-datos-asíncronos), [§6](./guia/02-fundamentos-react.md#6-custom-hooks), [§8](./guia/03-patrones-componentes.md#8-contenedor--presentacional) | [§1.1 SRP](./guia/01-principios.md#11-srp-single-responsibility-responsabilidad-única), [§15 Adapter](./guia/04-patrones-diseno.md#15-adapter) |
| 4 · useReducer + Context | [§7](./guia/02-fundamentos-react.md#7-usereducer--context-provider-pattern), [§20](./guia/04-patrones-diseno.md#20-command) | [§2.1 DRY](./guia/01-principios.md#21-dry-vs-aha), [§2.6 Fail fast](./guia/01-principios.md#26-fail-fast) |
| 5 · Compound + Feature-First | [§10](./guia/03-patrones-componentes.md#10-compound-components), [§24](./guia/05-arquitectura.md#24-feature-first), [§25](./guia/05-arquitectura.md#25-barrel-files) | [§11](./guia/03-patrones-componentes.md#11-polymorphic-components-prop-as), [§22](./guia/04-patrones-diseno.md#22-inyección-de-dependencias), [§27](./guia/05-arquitectura.md#27-hexagonal--ports--adapters) |
| [RETO-01](./retos/reto-01-selector-beneficiarios/ENUNCIADO.md) (Senior) | [§9](./guia/03-patrones-componentes.md#9-headless-ui-y-prop-getters), [§10](./guia/03-patrones-componentes.md#10-compound-components), [§21](./guia/04-patrones-diseno.md#21-repository), [§1.5 DIP](./guia/01-principios.md#15-dip-dependency-inversion-inversión-de-dependencias) | [§22](./guia/04-patrones-diseno.md#22-inyección-de-dependencias), [§26](./guia/05-arquitectura.md#26-arquitectura-en-capas), [§33](./guia/06-buenas-practicas.md#33-accesibilidad) |

## Índice

### [Parte I · Principios](./guia/01-principios.md)
1. [SOLID en React](./guia/01-principios.md#1-solid-en-react): [SRP](./guia/01-principios.md#11-srp-single-responsibility-responsabilidad-única) · [OCP](./guia/01-principios.md#12-ocp-openclosed-abiertocerrado) · [LSP](./guia/01-principios.md#13-lsp-liskov-substitution-sustitución-de-liskov) · [ISP](./guia/01-principios.md#14-isp-interface-segregation-segregación-de-interfaces) · [DIP](./guia/01-principios.md#15-dip-dependency-inversion-inversión-de-dependencias)
2. [Principios complementarios](./guia/01-principios.md#2-principios-complementarios): DRY/AHA, KISS/YAGNI, estados imposibles, Demeter, colocation, fail fast

### [Parte II · Fundamentos de React](./guia/02-fundamentos-react.md)
3. [Componentes y props](./guia/02-fundamentos-react.md#3-componentes-y-props)
4. [Estado](./guia/02-fundamentos-react.md#4-estado)
5. [Efectos y datos asíncronos](./guia/02-fundamentos-react.md#5-efectos-y-datos-asíncronos)
6. [Custom hooks](./guia/02-fundamentos-react.md#6-custom-hooks)
7. [useReducer + Context (Provider Pattern)](./guia/02-fundamentos-react.md#7-usereducer--context-provider-pattern)

### [Parte III · Patrones de componentes](./guia/03-patrones-componentes.md)
8. [Contenedor / Presentacional](./guia/03-patrones-componentes.md#8-contenedor--presentacional)
9. [Headless UI y Prop Getters](./guia/03-patrones-componentes.md#9-headless-ui-y-prop-getters)
10. [Compound Components](./guia/03-patrones-componentes.md#10-compound-components)
11. [Polymorphic Components (prop `as`)](./guia/03-patrones-componentes.md#11-polymorphic-components-prop-as)
12. [Slots, Render Props y composición](./guia/03-patrones-componentes.md#12-slots-render-props-y-composición)
13. [Controlado / No controlado](./guia/03-patrones-componentes.md#13-controlado--no-controlado)
14. [Higher-Order Components (legado)](./guia/03-patrones-componentes.md#14-higher-order-components-legado)

### [Parte IV · Patrones de diseño](./guia/04-patrones-diseno.md)
15. [Adapter](./guia/04-patrones-diseno.md#15-adapter)
16. [Strategy](./guia/04-patrones-diseno.md#16-strategy)
17. [Observer](./guia/04-patrones-diseno.md#17-observer)
18. [Factory](./guia/04-patrones-diseno.md#18-factory)
19. [Facade](./guia/04-patrones-diseno.md#19-facade)
20. [Command](./guia/04-patrones-diseno.md#20-command)
21. [Repository](./guia/04-patrones-diseno.md#21-repository)
22. [Inyección de Dependencias](./guia/04-patrones-diseno.md#22-inyección-de-dependencias)
23. [Singleton (y por qué evitarlo)](./guia/04-patrones-diseno.md#23-singleton-y-por-qué-evitarlo)

### [Parte V · Arquitectura](./guia/05-arquitectura.md)
24. [Feature-First](./guia/05-arquitectura.md#24-feature-first)
25. [Barrel Files](./guia/05-arquitectura.md#25-barrel-files)
26. [Arquitectura en capas](./guia/05-arquitectura.md#26-arquitectura-en-capas)
27. [Hexagonal / Ports & Adapters](./guia/05-arquitectura.md#27-hexagonal--ports--adapters)
28. [Flujo de datos unidireccional](./guia/05-arquitectura.md#28-flujo-de-datos-unidireccional)
29. [Estado del servidor vs. estado del cliente](./guia/05-arquitectura.md#29-estado-del-servidor-vs-estado-del-cliente)

### [Parte VI · Buenas prácticas](./guia/06-buenas-practicas.md)
30. [TypeScript aplicado a React](./guia/06-buenas-practicas.md#30-typescript-aplicado-a-react)
31. [Rendimiento](./guia/06-buenas-practicas.md#31-rendimiento)
32. [Manejo de errores](./guia/06-buenas-practicas.md#32-manejo-de-errores)
33. [Accesibilidad](./guia/06-buenas-practicas.md#33-accesibilidad)
34. [Testing](./guia/06-buenas-practicas.md#34-testing)
35. [Convenciones de nombres y organización](./guia/06-buenas-practicas.md#35-convenciones-de-nombres-y-organización)

### [Parte VII · Checklist y referencias](./guia/07-checklist-y-referencias.md)
36. [Checklist de antipatrones](./guia/07-checklist-y-referencias.md#36-checklist-de-antipatrones)
37. [Referencias](./guia/07-checklist-y-referencias.md#37-referencias)

## Mapa rápido: "tengo este problema, ¿qué patrón uso?"

| Síntoma en mi código | Mira |
|---|---|
| El componente tiene 200+ líneas y hace de todo | [SRP](./guia/01-principios.md#11-srp-single-responsibility-responsabilidad-única), [Contenedor/Presentacional](./guia/03-patrones-componentes.md#8-contenedor--presentacional), [Custom hooks](./guia/02-fundamentos-react.md#6-custom-hooks) |
| Cada caso nuevo agrega un `if` o una prop booleana | [OCP](./guia/01-principios.md#12-ocp-openclosed-abiertocerrado), [Strategy](./guia/04-patrones-diseno.md#16-strategy), [Slots](./guia/03-patrones-componentes.md#12-slots-render-props-y-composición) |
| `fetch` o `localStorage` dentro de componentes | [DIP](./guia/01-principios.md#15-dip-dependency-inversion-inversión-de-dependencias), [Repository](./guia/04-patrones-diseno.md#21-repository), [Adapter](./guia/04-patrones-diseno.md#15-adapter) |
| El formato de la API está por toda la UI | [Adapter](./guia/04-patrones-diseno.md#15-adapter) |
| Paso props por 4 niveles | [Context](./guia/02-fundamentos-react.md#7-usereducer--context-provider-pattern), [Composición](./guia/03-patrones-componentes.md#12-slots-render-props-y-composición) |
| Varios `useState` que cambian juntos con reglas | [useReducer](./guia/02-fundamentos-react.md#7-usereducer--context-provider-pattern), [Command](./guia/04-patrones-diseno.md#20-command) |
| `isLoading` + `isError` + `data` desincronizados | [Estados imposibles](./guia/01-principios.md#23-haz-imposibles-los-estados-imposibles) |
| Un componente con muchas partes que varían por pantalla | [Compound Components](./guia/03-patrones-componentes.md#10-compound-components) |
| Misma lógica, distintas apariencias | [Headless UI](./guia/03-patrones-componentes.md#9-headless-ui-y-prop-getters) |
| "Se ve como botón, pero navega" | [Polymorphic](./guia/03-patrones-componentes.md#11-polymorphic-components-prop-as) |
| Varias partes deben reaccionar a un mismo evento | [Observer](./guia/04-patrones-diseno.md#17-observer) |
| Necesito deshacer/rehacer | [Command](./guia/04-patrones-diseno.md#20-command) |
| Las carpetas `components/` y `hooks/` son gigantes | [Feature-First](./guia/05-arquitectura.md#24-feature-first) |
| La UI va lenta | [Rendimiento](./guia/06-buenas-practicas.md#31-rendimiento) |
