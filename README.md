# Path to Senior

Práctica guiada para pasar de Junior a Senior en React + TypeScript: retos con evaluación socrática y un centro de estudio de principios, patrones y arquitectura.

- **[ESTUDIO.md](./ESTUDIO.md)**: centro de estudio (SOLID, patrones de React, patrones de diseño, arquitectura y buenas prácticas, con ejemplos).
- **[retos/](./retos/)**: un reto por carpeta. Cada uno tiene su `ENUNCIADO.md`, su app en `src/` y sus `revisiones/`.
- **[CLAUDE.md](./CLAUDE.md)**: reglas del mentor (Claude sugiere, no escribe tu solución).

## Estructura

```
├── ESTUDIO.md                 # índice del centro de estudio
├── guia/                      # partes I–VII de la guía
├── retos/
│   ├── _plantilla/            # app Vite + React + TS base para retos nuevos
│   ├── reto-01-selector-beneficiarios/
│   └── reto-02-libreria/
├── scripts/nuevo-reto.mjs
├── pnpm-workspace.yaml        # workspace + catalog de versiones compartidas
├── tsconfig.base.json         # reglas estrictas de TypeScript comunes a todos los retos
└── .oxlintrc.json             # reglas de lint comunes
```

## Comandos

```bash
pnpm install                         # instala todo el workspace

pnpm --filter reto-02 dev            # levanta un reto (o `pnpm dev` dentro de su carpeta)
pnpm --filter reto-02 build          # type-check + build de un reto
pnpm --filter reto-02 lint           # lint de un reto

pnpm build                           # build de todos los retos
pnpm lint                            # lint de todos los retos

pnpm nuevo-reto 03 dashboard-ventas  # crea retos/reto-03-dashboard-ventas desde la plantilla
pnpm --filter reto-03 add zod        # agrega una dependencia a un solo reto
```

Stack: React 19 · TypeScript 7 · Vite 8 · Oxlint · pnpm workspaces.
