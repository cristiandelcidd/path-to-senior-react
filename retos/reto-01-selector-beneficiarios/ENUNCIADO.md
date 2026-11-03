# Reto Senior #1: Selector de Beneficiarios para Transferencias

> **Ejecutar:** `pnpm --filter reto-01 dev` desde la raíz, o `pnpm dev` dentro de esta carpeta. El código va en `src/` de esta carpeta, y las evaluaciones en `revisiones/`.
> Teoría de apoyo: [`ESTUDIO.md`](../../ESTUDIO.md), secciones 1.5, 9, 10, 21, 22 y 26.

## 1. Problema de negocio

Trabajas en el equipo de **Pagos** de un banco digital. Para hacer una transferencia, el usuario tiene que elegir un **beneficiario** entre sus contactos guardados. Hoy hay tres pantallas (Transferencia rápida, Pagos programados y Solicitar dinero) y cada una tiene su propio selector, copiado y modificado a mano. Esto trae tres problemas:

- **El diseño no es consistente.** Una pantalla muestra avatar y banco, otra solo el alias, y la tercera agrupa por favoritos.
- **El acceso a datos está acoplado.** Los selectores llaman a `fetch` directamente. El equipo de QA quiere probar la UI sin backend, y el producto pide un modo offline que lea de una caché local. Hoy eso significa reescribir los componentes.
- **Hay un bug de carrera en producción.** Si el usuario escribe rápido, a veces se ve la lista de una búsqueda anterior, porque una respuesta lenta llega después de una más reciente.

Tu misión es construir **una sola feature reutilizable** que resuelva las tres cosas.

## 2. Requisitos técnicos

### R1. Patrones de componentes (Compound + Headless)

- Toda la lógica (texto buscado, resultados, estado de carga, error, elemento resaltado, selección y navegación por teclado) vive en un **custom hook headless** que no renderiza nada.
- Encima del hook construyes una **API de Compound Components** con un namespace público y subcomponentes: raíz, campo de búsqueda, lista, opción, estado vacío y estado de carga.
- Cada pantalla decide **qué se muestra y en qué orden**. Por ejemplo, Pagos programados pone el estado vacío antes de la lista y Transferencia rápida muestra un avatar personalizado dentro de cada opción. La feature no debe saber nada de estas diferencias.
- Un subcomponente usado fuera de la raíz debe fallar con un **error descriptivo**, no con un `undefined` silencioso.
- La selección debe funcionar en modo **controlado y no controlado**, con la misma semántica que un `<input>` nativo.

### R2. SOLID: Inversión de Dependencias

- Ni los componentes ni el hook conocen el origen de los datos. Dependen de un **contrato (puerto)** del repositorio de beneficiarios, definido en la capa de dominio.
- Entrega **dos adaptadores** que cumplan ese contrato:
  1. **En memoria:** datos fijos y una latencia artificial *aleatoria*, para que se pueda reproducir el bug de carrera.
  2. **HTTP:** puede apuntar a una URL ficticia. Lo que importa es su forma y su manejo de errores, no que funcione contra un servidor real.
- La implementación concreta se **inyecta desde fuera** de la feature (desde `App.tsx`) con un mecanismo de provisión que tú eliges.
- El contrato tiene que permitir **cancelar** una búsqueda en curso. Decidir cómo expresarlo en el puerto sin filtrar detalles de infraestructura es parte del reto.

### R3. Arquitectura Feature-First + Barrel

- Todo vive en `src/features/beneficiary-picker/`.
- `index.ts` es la **única puerta de entrada**. Expone lo mínimo que un consumidor necesita, y nada de lo interno (contextos, helpers ni el hook de acceso al contexto) se puede importar desde fuera.
- Decide qué expone el barrel y justifícalo: ¿exportas los adaptadores o solo el contrato? ¿Exportas el hook headless para quien quiera su propia UI?

### R4. Restricciones del proyecto (ver CLAUDE.md)

- Sin `any` y sin aserciones `as Type` para "arreglar" tipos.
- Sin `enum` ni `namespace`, porque `erasableSyntaxOnly` está activo. Modela los estados con uniones discriminadas.
- Uso de `import type` donde corresponda (`verbatimModuleSyntax`).
- `pnpm build` y `pnpm lint` en verde dentro de esta carpeta, sin warnings de `react/only-export-components`.
- Accesibilidad: patrón ARIA *combobox*, con roles, `aria-activedescendant`, `aria-expanded` y navegación con ↑ ↓ Enter Escape.

## 3. Estructura de archivos

```
src/features/beneficiary-picker/
├── index.ts                                  # Barrel: única API pública
├── domain/
│   ├── beneficiary.ts                        # Entidad y tipos de valor
│   ├── beneficiary-repository.ts             # Puerto (contrato abstracto)
│   └── search-state.ts                       # Unión discriminada idle/loading/success/error
├── infrastructure/
│   ├── in-memory-beneficiary-repository.ts   # Adaptador con latencia aleatoria
│   └── http-beneficiary-repository.ts        # Adaptador HTTP
├── providers/
│   ├── repository-context.ts                 # Contexto del puerto (sin JSX)
│   └── beneficiary-repository-provider.tsx   # Punto de inyección
├── hooks/
│   ├── use-beneficiary-repository.ts         # Acceso interno al puerto
│   └── use-beneficiary-search.ts             # Hook headless
└── components/
    ├── beneficiary-picker-context.ts         # Contexto compartido del compound
    ├── beneficiary-picker-root.tsx
    ├── beneficiary-picker-input.tsx
    ├── beneficiary-picker-list.tsx
    ├── beneficiary-picker-option.tsx
    ├── beneficiary-picker-empty.tsx
    ├── beneficiary-picker-loading.tsx
    └── beneficiary-picker.tsx                # Ensambla el namespace compuesto
```

Por último, reemplaza el contenido de `src/App.tsx` con **dos composiciones distintas** del selector, una para Transferencia rápida y otra para Pagos programados. Cada una debe usar un adaptador diferente.

## 4. Criterios de aceptación

1. **El adaptador se cambia en una sola línea.** Cambiar de adaptador en memoria a HTTP solo requiere modificar el punto de inyección en `App.tsx`. Ningún archivo de `components/` ni `hooks/` importa algo de `infrastructure/`, y en esas carpetas no aparecen `fetch` ni URLs.
2. **No hay condición de carrera.** Con el adaptador en memoria y latencia aleatoria, si se escribe rápido "ana" y luego "andrea", la lista final siempre corresponde a "andrea". Las peticiones obsoletas se cancelan o se ignoran, y los estados de carga y error nunca se pueden combinar de forma imposible (por ejemplo, `loading` y `error` a la vez).
3. **El barrel encapsula la feature y el compound se puede componer.** `App.tsx` importa **solo** desde `features/beneficiary-picker` (el `index.ts`) y nunca desde rutas internas. Las dos composiciones tienen estructuras visuales diferentes sin pasar props de configuración del tipo `showEmptyFirst`. Un subcomponente fuera de la raíz lanza un error con un mensaje claro.

## 5. Pregunta inicial

Si el hook headless recibiera el repositorio como parámetro en lugar de leerlo del contexto, ¿seguiría cumpliendo DIP? ¿Qué ganarías y qué perderías con cada opción?
