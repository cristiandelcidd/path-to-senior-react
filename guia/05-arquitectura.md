# Parte V · Arquitectura

[← Parte IV: Patrones de diseño](./04-patrones-diseno.md) · [Índice](../ESTUDIO.md) · [Parte VI: Buenas prácticas →](./06-buenas-practicas.md)

---

## 24. Feature-First

Organiza por **dominio de negocio**, no por tipo técnico. Todo lo que cambia junto vive junto.

#### Ejemplo 1: Por tipo vs. por feature (plataforma de cursos)

❌ **Por tipo técnico**: agregar "certificados" toca 5 carpetas.

```
src/
├── components/   CourseCard.tsx, LessonPlayer.tsx, QuizQuestion.tsx, CertificateBadge.tsx …
├── hooks/        useCourses.ts, useLesson.ts, useQuiz.ts …
├── services/     coursesApi.ts, quizApi.ts …
├── types/        course.ts, quiz.ts …
└── utils/        …
```

✅ **Por feature**: agregar "certificados" es agregar una carpeta.

```
src/
├── app/                       # Composition Root: providers, rutas, ensamblado
├── features/
│   ├── courses/
│   │   ├── components/        # CourseCard, CourseList
│   │   ├── hooks/             # use-courses
│   │   ├── domain/            # course.ts, courses-repository.ts
│   │   ├── infrastructure/    # http-courses-repository.ts
│   │   └── index.ts
│   ├── lessons/
│   ├── quizzes/
│   └── certificates/
└── shared/
    ├── ui/                    # Button, Card, Dialog… (sin dominio)
    ├── hooks/                 # use-media-query, use-debounced-value
    └── lib/                   # format-date, create-store
```

#### Ejemplo 2: Reglas de dependencia

```
app  ──►  features  ──►  shared
            │
            └──►  otra feature SOLO vía su index.ts
```

```ts
// ✅ app consume features por su API pública
import { CourseList } from '@/features/courses'

// ✅ una feature consume shared
import { Card } from '@/shared/ui'

// ✅ una feature consume otra por su API pública
import { useCurrentLesson } from '@/features/lessons'

// ❌ cruzar la frontera hacia archivos internos
import { lessonsReducer } from '@/features/lessons/state/lessons-reducer'

// ❌ shared conoce el dominio
// shared/ui/card.tsx
import type { Course } from '@/features/courses'
```

> El proyecto no tiene configurado el alias `@/`. Puedes usar rutas relativas o configurar el alias en `tsconfig.app.json` (`paths`) y en `vite.config.ts` (`resolve.alias`).

#### Ejemplo 3: ¿Cuándo algo sube a `shared`?

| Situación | Decisión |
|---|---|
| `useDebouncedValue` se usa en 3 features y no sabe nada de negocio | Sube a `shared/hooks` |
| `formatCoursePrice` se usa en `courses` y `checkout` | Se queda en `courses` y se exporta en su `index.ts`. **Es de dominio** |
| `CourseCard` se usa en `courses` y `dashboard` | Se exporta desde `courses`. `dashboard` la importa por el barrel |
| Dos features se importan mutuamente todo el tiempo | Señal de que el límite está mal: ¿son una sola feature? |

💡 **YAGNI:** no crees `domain/` o `infrastructure/` vacías. Crea cada carpeta cuando haya algo que poner.

📚 [Bulletproof React: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) · [Feature-Sliced Design](https://feature-sliced.design/)

---

## 25. Barrel Files

`index.ts` en la **frontera** de cada feature, con su **API pública explícita**.

#### Ejemplo 1: Barrel explícito

```ts
// features/courses/index.ts
export { CourseList } from './components/course-list'
export { CourseCard } from './components/course-card'
export { CoursesRepositoryProvider } from './providers/courses-repository-provider'
export { useCourses } from './hooks/use-courses'
export type { Course, CourseLevel } from './domain/course'
export type { CoursesRepository } from './domain/courses-repository'

// NO se exporta: el contexto crudo, el hook de acceso interno ni CourseCardSkeleton (uso interno)
```

#### Ejemplo 2: Barrel peligroso

```ts
// ❌ Expone TODO, incluido lo interno, y acopla a los consumidores con tu estructura
export * from './components/course-list'
export * from './components/course-card'
export * from './components/course-card-skeleton'
export * from './providers/courses-repository-context'
export * from './hooks'
export * from './domain'
export * from './infrastructure'
```

**Problemas:**
- No hay encapsulamiento.
- Conflictos de nombres silenciosos.
- *Tree-shaking* más difícil.
- Las herramientas tardan más en resolver imports.

#### Ejemplo 3: Ciclo por importar el propio barrel

```ts
// ❌ features/courses/components/course-list.tsx
import { CourseCard, useCourses } from '..'   // importa su propio index.ts

// index.ts → course-list.tsx → index.ts → …  ciclo: valores undefined en runtime o HMR roto
```

```ts
// ✅ Dentro de la feature, rutas relativas directas
import { CourseCard } from './course-card'
import { useCourses } from '../hooks/use-courses'
```

💡 **Regla:** el barrel es para **quien está afuera**. Desde adentro, nunca se usa.

📚 [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) (lectura crítica)

---

## 26. Arquitectura en capas

| Capa | Contiene | Depende de |
|---|---|---|
| **Presentación** | Componentes, estilos | Aplicación, Dominio |
| **Aplicación** | Hooks de caso de uso, orquestación | Dominio |
| **Dominio** | Tipos, reglas puras, contratos | Nada |
| **Infraestructura** | Implementaciones de los contratos | Dominio |

#### Ejemplo: "Suscribirse al newsletter" recorriendo las capas

```ts
// domain/subscription.ts: reglas puras, sin React ni I/O
export type Subscription = { email: string; topics: readonly Topic[] }
export type Topic = 'product' | 'engineering' | 'events'

export function validateSubscription(input: Subscription): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) return 'El correo no es válido'
  if (input.topics.length === 0) return 'Elige al menos un tema'
  return null
}

// domain/subscriptions-gateway.ts: contrato
export interface SubscriptionsGateway {
  subscribe(subscription: Subscription): Promise<void>
}
```

```ts
// infrastructure/http-subscriptions-gateway.ts
export function createHttpSubscriptionsGateway(baseUrl: string): SubscriptionsGateway {
  return {
    async subscribe(subscription) {
      const response = await fetch(`${baseUrl}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      if (!response.ok) throw new Error('No se pudo completar la suscripción')
    },
  }
}
```

```ts
// application/use-subscribe.ts: caso de uso
type SubscribeState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'invalid'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'subscribed' }

export function useSubscribe(gateway: SubscriptionsGateway) {
  const [state, setState] = useState<SubscribeState>({ status: 'idle' })

  async function subscribe(input: Subscription) {
    const validationError = validateSubscription(input)
    if (validationError) return setState({ status: 'invalid', message: validationError })

    setState({ status: 'submitting' })
    try {
      await gateway.subscribe(input)
      setState({ status: 'subscribed' })
    } catch (error) {
      setState({ status: 'failed', message: error instanceof Error ? error.message : 'Error inesperado' })
    }
  }

  return { state, subscribe }
}
```

```tsx
// presentation/newsletter-form.tsx: solo UI
function NewsletterForm({ gateway }: { gateway: SubscriptionsGateway }) {
  const { state, subscribe } = useSubscribe(gateway)
  // … inputs; muestra state.message si es 'invalid' o 'failed'; "¡Gracias!" si es 'subscribed'
}
```

💡 La capa de dominio (`validateSubscription`) se testea con tests de una línea, sin React, sin red y sin mocks.

---

## 27. Hexagonal / Ports & Adapters

Es la formalización de las capas:
- El **núcleo** define **puertos** (interfaces).
- Los **adaptadores** conectan esos puertos con el mundo exterior.

```
                ┌──────────────────────────────────────┐
  UI (React) ──►│ puerto de entrada: casos de uso       │
                │       (hooks / servicios)             │
                │                                       │
                │        NÚCLEO: dominio + reglas       │
                │                                       │
                │ puertos de salida: interfaces         │──► adaptador HTTP
                │ (SubscriptionsGateway, PrefsStore…)   │──► adaptador localStorage
                └──────────────────────────────────────┘──► adaptador en memoria (tests)
```

#### Ejemplo 1: El mismo puerto, tres adaptadores

```ts
// Producción
const gateway = createHttpSubscriptionsGateway('/api')

// Demo o Storybook: siempre funciona
const fakeGateway: SubscriptionsGateway = { subscribe: async () => {} }

// Test de error: siempre falla
const failingGateway: SubscriptionsGateway = {
  subscribe: async () => { throw new Error('Servicio caído') },
}
```

#### Ejemplo 2: ¿Cuándo vale la pena?

| Úsala | Evítala |
|---|---|
| Hay (o habrá) más de una implementación real | Una pantalla estática o un CRUD trivial |
| Lógica de negocio sustancial que quieres testear aislada | Un prototipo para validar una idea |
| Quieres demos y tests sin backend | Equipo de una persona y vida útil corta |

💡 Arquitectura no es "más carpetas". Es poner **límites donde el cambio es probable**.

📚 [Alistair Cockburn: Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) · [Martin Fowler: Modularizing React Applications](https://martinfowler.com/articles/modularizing-react-apps.html)

---

## 28. Flujo de datos unidireccional

Los datos **bajan** por props y los eventos **suben** por callbacks.

#### Ejemplo 1: Hijo que muta datos del padre

❌ **Antes**

```tsx
function TaskItem({ task }: { task: Task }) {
  return (
    <input
      type="checkbox"
      checked={task.done}
      onChange={() => { task.done = !task.done }} // ❌ muta un objeto del padre; React no se entera
    />
  )
}
```

✅ **Después**

```tsx
function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
}

function TaskList() {
  const [tasks, setTasks] = useState<readonly Task[]>(initialTasks)
  const toggle = (id: string) =>
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  return tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggle} />)
}
```

#### Ejemplo 2: El ciclo Flux con un reducer

```
 [Vista] ──dispatch(acción)──► [Reducer] ──nuevo estado──► [Vista se re-renderiza]
    ▲                                                            │
    └────────────────────────────────────────────────────────────┘
```

Cualquier cambio de estado se puede rastrear hasta **una acción concreta**. Por eso los reducers facilitan depurar (y las DevTools de Redux pueden "viajar en el tiempo").

📚 [Flux: In-Depth Overview (archivado)](https://github.com/facebookarchive/flux/blob/main/docs/In-Depth-Overview.md)

---

## 29. Estado del servidor vs. estado del cliente

| | Estado del servidor | Estado del cliente |
|---|---|---|
| Ejemplos | Usuarios, pedidos, cursos | Modal abierto, tema, filtro activo |
| Dueño real | El backend | El navegador |
| Problemas | Caché, invalidación, reintentos, duplicados, datos obsoletos | Sincronización entre componentes |
| Herramientas | TanStack Query, SWR, RTK Query | `useState`, `useReducer`, Context, Zustand |

#### Ejemplo 1: A mano vs. con una librería de *server state*

```tsx
// A mano: tú resuelves loading, error, carrera, caché, reintentos, refetch al volver a la pestaña…
// (buen ejercicio para aprender; costoso de mantener en producción)

// Con TanStack Query (NO está instalado en este proyecto; es solo ilustrativo)
function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: ({ signal }) => coursesRepository.getById(courseId, { signal }),
    staleTime: 60_000,
  })
}
// Devuelve { data, isPending, isError, error, refetch } y deduplica peticiones iguales entre componentes.
```

#### Ejemplo 2: La URL como estado

Algunos estados de cliente **deberían vivir en la URL**: filtros, página actual, pestaña activa. Así se pueden compartir, sobreviven a recargas y funcionan con atrás/adelante.

```ts
// Sin router: leer y escribir query params con las APIs del navegador
function readFilters(): { level: string | null; page: number } {
  const params = new URLSearchParams(window.location.search)
  return { level: params.get('level'), page: Number(params.get('page') ?? '1') }
}

function writeFilters(filters: { level: string | null; page: number }) {
  const params = new URLSearchParams()
  if (filters.level) params.set('level', filters.level)
  params.set('page', String(filters.page))
  window.history.replaceState(null, '', `?${params}`)
}
```

#### Ejemplo 3: ¿Dónde vive cada estado?

| Estado | Lugar recomendado |
|---|---|
| Lista de cursos del backend | *Server state* (librería, o un hook propio mientras aprendes) |
| Curso filtrado por nivel | URL (`?level=advanced`) |
| Input de búsqueda mientras escribes | `useState` local |
| Tema claro u oscuro | Context + `localStorage` |
| Modal de confirmación abierto | `useState` en el componente que lo abre |
| Borrador de un formulario largo | `useReducer` local + `localStorage` |

📚 [TkDodo: Practical React Query](https://tkdodo.eu/blog/practical-react-query) · [TanStack Query: Overview](https://tanstack.com/query/latest/docs/framework/react/overview)

---

[← Parte IV: Patrones de diseño](./04-patrones-diseno.md) · [Índice](../ESTUDIO.md) · [Parte VI: Buenas prácticas →](./06-buenas-practicas.md)
