# Parte IV · Patrones de diseño aplicados al frontend

[← Parte III: Patrones de componentes](./03-patrones-componentes.md) · [Índice](../ESTUDIO.md) · [Parte V: Arquitectura →](./05-arquitectura.md)

> Los patrones clásicos (GoF y afines) no son exclusivos de la POO: en TypeScript se expresan con **funciones, objetos e interfaces**, sin necesidad de clases.

| Patrón | Problema que resuelve | Señal de que lo necesitas |
|---|---|---|
| Adapter | Interfaces incompatibles | El formato de la API se filtra a toda la UI |
| Strategy | Algoritmos intercambiables | Un `switch` que crece con cada caso nuevo |
| Observer | Notificar cambios a interesados | Varios lugares deben reaccionar a un mismo evento |
| Factory | Crear objetos según la configuración | `if (env === …) new A() else new B()` repetido |
| Facade | Simplificar un subsistema complejo | Componentes que coordinan 4 o 5 hooks o servicios |
| Command | Encapsular una petición | Necesitas deshacer, registrar o reproducir acciones |
| Repository | Abstraer el acceso a datos | `fetch` disperso; tests que necesitan red |
| Dependency Injection | Desacoplar de implementaciones | Imports directos de infraestructura |

---

## 15. Adapter

Convierte una interfaz en otra que tu código espera.

#### Ejemplo 1: DTO de la API → modelo de dominio

```ts
// Lo que manda la API (fuera de tu control)
type UserDto = { user_id: number; first_name: string; last_name: string; created_at: string; is_admin: 0 | 1 }

// Lo que usa tu aplicación
type User = { id: string; fullName: string; memberSince: Date; role: 'admin' | 'member' }

export function toUser(dto: UserDto): User {
  return {
    id: String(dto.user_id),
    fullName: `${dto.first_name} ${dto.last_name}`.trim(),
    memberSince: new Date(dto.created_at),
    role: dto.is_admin === 1 ? 'admin' : 'member',
  }
}
```

💡 Si el backend renombra `first_name`, cambias **una** función. La UI nunca ve `snake_case` ni `0 | 1`.

#### Ejemplo 2: Adaptar una librería de terceros

```ts
// shared/lib/dates.ts: la app depende de ESTA interfaz, no de la librería
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatShortDate(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: es })
}

export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es })
}
```

💡 Si mañana migras a `Intl.DateTimeFormat` o a otra librería, solo cambia este archivo. Sin adapter, `date-fns` estaría importada en 40 componentes.

#### Ejemplo 3: Adaptar una API del navegador a un contrato propio

```ts
// domain/preferences-store.ts
export interface PreferencesStore {
  load(): Preferences | null
  save(preferences: Preferences): void
}
```

```ts
// infrastructure/local-storage-preferences-store.ts
const STORAGE_KEY = 'app:preferences:v1'

export const localStoragePreferencesStore: PreferencesStore = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) return null
      const parsed: unknown = JSON.parse(raw)
      return isPreferences(parsed) ? parsed : null // type guard: ver §30
    } catch {
      return null // JSON corrupto o storage bloqueado (modo privado)
    }
  },
  save(preferences) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // cuota excedida o storage bloqueado: se decide no romper la app
    }
  },
}
```

💡 El adapter **absorbe** las rarezas de la API (strings, excepciones, `null`) y expone un contrato limpio. El `v1` en la clave permite migrar el formato en el futuro.

---

## 16. Strategy

Familia de algoritmos intercambiables bajo una misma firma.

#### Ejemplo 1: Reglas de validación

```ts
type PasswordRule = { id: string; message: string; test: (value: string) => boolean }

const passwordRules: readonly PasswordRule[] = [
  { id: 'length', message: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'digit', message: 'Al menos un número', test: (v) => /\d/.test(v) },
  { id: 'upper', message: 'Al menos una mayúscula', test: (v) => /[A-Z]/.test(v) },
]

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul>
      {passwordRules.map((rule) => (
        <li key={rule.id} className={rule.test(password) ? 'ok' : 'pending'}>{rule.message}</li>
      ))}
    </ul>
  )
}
```

#### Ejemplo 2: Formatos de exportación

```ts
type ExportFormat = 'csv' | 'json'

type ExportStrategy = {
  mimeType: string
  extension: string
  serialize: (rows: readonly Record<string, string | number>[]) => string
}

const exportStrategies: Record<ExportFormat, ExportStrategy> = {
  csv: {
    mimeType: 'text/csv',
    extension: 'csv',
    serialize: (rows) => {
      const headers = Object.keys(rows[0] ?? {})
      const lines = rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
      return [headers.join(','), ...lines].join('\n')
    },
  },
  json: {
    mimeType: 'application/json',
    extension: 'json',
    serialize: (rows) => JSON.stringify(rows, null, 2),
  },
}

function exportReport(rows: readonly Record<string, string | number>[], format: ExportFormat) {
  const strategy = exportStrategies[format]
  const blob = new Blob([strategy.serialize(rows)], { type: strategy.mimeType })
  downloadBlob(blob, `reporte.${strategy.extension}`)
}
```

💡 Agregar `'xlsx'` es agregar una entrada. `Record<ExportFormat, …>` hace que TypeScript exija la estrategia de cada formato.

#### Ejemplo 3: Estrategia elegida por el negocio

```ts
type MembershipTier = 'free' | 'pro' | 'enterprise'

const discountByTier: Record<MembershipTier, (price: number) => number> = {
  free: (price) => price,
  pro: (price) => price * 0.9,
  enterprise: (price) => Math.max(0, price * 0.8 - 5),
}

export function finalPrice(price: number, tier: MembershipTier): number {
  return Math.round(discountByTier[tier](price) * 100) / 100
}
```

---

## 17. Observer

Un sujeto notifica a sus suscriptores cuando cambia. Para conectar React a una fuente observable externa, la herramienta oficial es `useSyncExternalStore`.

#### Ejemplo 1: Estado de conexión

```ts
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}
```

#### Ejemplo 2: Un store mínimo propio

```ts
// shared/lib/create-store.ts
type Listener = () => void

export function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    setState: (updater: (current: T) => T) => {
      state = updater(state)
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

```ts
// features/toasts/toast-store.ts
type Toast = { id: string; message: string; tone: 'info' | 'error' }

export const toastStore = createStore<readonly Toast[]>([])

export function showToast(message: string, tone: Toast['tone'] = 'info') {
  toastStore.setState((toasts) => [...toasts, { id: crypto.randomUUID(), message, tone }])
}

export function useToasts(): readonly Toast[] {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getState)
}
```

💡 `showToast` se puede llamar **desde fuera de React** (por ejemplo, en un interceptor HTTP), y los componentes suscritos se actualizan. Así funcionan internamente librerías como Zustand.

#### Ejemplo 3: Event bus tipado (pub/sub)

```ts
type AppEvents = {
  'session:expired': { reason: 'timeout' | 'revoked' }
  'file:uploaded': { fileId: string; sizeBytes: number }
}

function createEventBus<Events extends Record<string, unknown>>() {
  const handlers = new Map<keyof Events, Set<(payload: never) => void>>()

  return {
    on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void) {
      const set = handlers.get(event) ?? new Set()
      set.add(handler)
      handlers.set(event, set)
      return () => set.delete(handler)
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]) {
      handlers.get(event)?.forEach((handler) => (handler as (p: Events[K]) => void)(payload))
    },
  }
}

export const appEvents = createEventBus<AppEvents>()

// appEvents.emit('file:uploaded', { fileId: 'a1', sizeBytes: 2048 })      ✅
// appEvents.emit('file:uploaded', { fileId: 'a1' })                        ❌ falta sizeBytes
```

⚠️ **Úsalo con moderación.** Un event bus global oculta quién depende de quién. Para comunicación padre-hijo, usa props. Para estado compartido, usa un store o un contexto. El bus sirve para eventos **transversales** (sesión expirada, telemetría).

📚 [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

---

## 18. Factory

Centraliza la **creación** cuando depende de configuración y oculta la implementación concreta.

#### Ejemplo 1: Elegir la implementación según el entorno

```ts
import type { AnalyticsTracker } from '../domain/analytics-tracker'

export function createAnalyticsTracker(mode: 'development' | 'production' | 'test'): AnalyticsTracker {
  switch (mode) {
    case 'production': return createHttpAnalyticsTracker('/api/events')
    case 'development': return consoleAnalyticsTracker
    case 'test': return { track: () => {} }
  }
}

// app/main.tsx
const tracker = createAnalyticsTracker(import.meta.env.PROD ? 'production' : 'development')
```

#### Ejemplo 2: Cliente HTTP configurado

```ts
type HttpClient = {
  get<T>(path: string, parse: (data: unknown) => T): Promise<T>
}

export function createHttpClient({ baseUrl, getToken }: { baseUrl: string; getToken: () => string | null }): HttpClient {
  return {
    async get(path, parse) {
      const token = getToken()
      const response = await fetch(`${baseUrl}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} en ${path}`)
      return parse(await response.json())
    },
  }
}

// Dos clientes con configuraciones distintas, sin singletons globales
const publicApi = createHttpClient({ baseUrl: '/api/public', getToken: () => null })
const privateApi = createHttpClient({ baseUrl: '/api', getToken: () => sessionStore.getState().token })
```

#### Ejemplo 3: Mapa de componentes para formularios dinámicos

```tsx
type FieldConfig =
  | { kind: 'text'; name: string; label: string }
  | { kind: 'number'; name: string; label: string; min?: number }
  | { kind: 'checkbox'; name: string; label: string }

function renderField(field: FieldConfig): ReactNode {
  switch (field.kind) {
    case 'text': return <TextField key={field.name} name={field.name} label={field.label} />
    case 'number': return <TextField key={field.name} name={field.name} label={field.label} type="number" min={field.min} />
    case 'checkbox': return <Checkbox key={field.name} name={field.name} label={field.label} />
  }
}

// El formulario se construye a partir de datos (por ejemplo, una configuración del backend)
<form>{surveyFields.map(renderField)}</form>
```

---

## 19. Facade

Ofrece una interfaz simple sobre un subsistema complejo.

#### Ejemplo 1: Facade sobre `fetch`

```ts
// En vez de repetir headers, JSON, manejo de status y errores en cada llamada
export async function getJson<T>(url: string, parse: (data: unknown) => T, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!response.ok) throw new HttpError(response.status, url)
  return parse(await response.json())
}

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, url: string) {
    super(`La petición a ${url} falló con estado ${status}`)
    this.name = 'HttpError'
    this.status = status
  }
}
```

> Nota: `erasableSyntaxOnly` prohíbe las *parameter properties* (`constructor(readonly status: number)`), por eso la propiedad se declara y se asigna aparte.

#### Ejemplo 2: Hook fachada sobre una API imperativa del navegador

```tsx
function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  return {
    videoRef,
    isPlaying,
    togglePlay: () => {
      const video = videoRef.current
      if (!video) return
      if (video.paused) {
        void video.play()
        setIsPlaying(true)
      } else {
        video.pause()
        setIsPlaying(false)
      }
    },
    seekBy: (seconds: number) => {
      if (videoRef.current) videoRef.current.currentTime += seconds
    },
  }
}

function LessonPlayer({ src }: { src: string }) {
  const { videoRef, isPlaying, togglePlay, seekBy } = useVideoPlayer()
  return (
    <figure>
      <video ref={videoRef} src={src} />
      <button type="button" onClick={() => seekBy(-10)}>-10 s</button>
      <button type="button" onClick={togglePlay}>{isPlaying ? 'Pausa' : 'Reproducir'}</button>
    </figure>
  )
}
```

#### Ejemplo 3: Facade de caso de uso

```tsx
// Coordina 4 subsistemas; el componente solo ve 3 cosas
function useAccountDeletion() {
  const { user } = useSession()
  const { exportData } = useDataExport()
  const tracker = useAnalytics()
  const { signOut } = useAuthActions()

  return {
    canDelete: user?.role !== 'owner',
    exportBeforeDelete: () => exportData(user?.id),
    deleteAccount: async () => {
      await accountService.delete(user?.id)
      tracker.track('account_deleted')
      signOut()
    },
  }
}
```

⚠️ **Riesgo:** que la fachada se vuelva un "objeto dios". Si crece mucho, divídela por caso de uso.

---

## 20. Command

Encapsula una petición como un objeto. **Las acciones de un reducer son comandos.**

#### Ejemplo 1: Acciones como comandos

```ts
type EditorCommand =
  | { type: 'textInserted'; at: number; text: string }
  | { type: 'textDeleted'; from: number; to: number }
  | { type: 'formatApplied'; from: number; to: number; format: 'bold' | 'italic' }

// Los comandos son datos: se pueden registrar, serializar, enviar por red o reproducir
const history: EditorCommand[] = []
```

#### Ejemplo 2: Deshacer/rehacer genérico

```ts
type History<T> = { past: readonly T[]; present: T; future: readonly T[] }

type HistoryAction<T> =
  | { type: 'set'; value: T }
  | { type: 'undo' }
  | { type: 'redo' }

function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case 'set':
      return { past: [...state.past, state.present], present: action.value, future: [] }
    case 'undo': {
      const previous = state.past.at(-1)
      if (previous === undefined) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (next === undefined) return state
      return { past: [...state.past, state.present], present: next, future: rest }
    }
  }
}

export function useUndoableState<T>(initial: T) {
  const [state, dispatch] = useReducer(historyReducer<T>, { past: [], present: initial, future: [] })
  return {
    value: state.present,
    set: (value: T) => dispatch({ type: 'set', value }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}

// const drawing = useUndoableState<readonly Shape[]>([])
```

#### Ejemplo 3: Registro de comandos (atajos de teclado / paleta de comandos)

```ts
type Command = { id: string; label: string; shortcut?: string; run: () => void }

function createCommandRegistry() {
  const commands = new Map<string, Command>()
  return {
    register: (command: Command) => {
      commands.set(command.id, command)
      return () => commands.delete(command.id)
    },
    run: (id: string) => commands.get(id)?.run(),
    list: () => [...commands.values()],
  }
}

// El menú, la paleta y los atajos de teclado ejecutan LOS MISMOS comandos
registry.register({ id: 'doc.save', label: 'Guardar', shortcut: 'Ctrl+S', run: saveDocument })
```

---

## 21. Repository

Abstrae el acceso a datos detrás de una interfaz con **lenguaje de dominio**.

- El contrato vive en el dominio y las implementaciones en la infraestructura.
- Devuelve **modelos de dominio**, no DTOs (usa Adapter adentro).
- Diseña el contrato desde lo que **la UI necesita**, no desde lo que expone la API.

#### Ejemplo 1: Contrato + dos implementaciones (notas)

```ts
// features/notes/domain/note.ts
export type Note = { id: string; title: string; body: string; updatedAt: Date }
export type NewNote = Pick<Note, 'title' | 'body'>
```

```ts
// features/notes/domain/notes-repository.ts
import type { NewNote, Note } from './note'

export interface NotesRepository {
  list(): Promise<readonly Note[]>
  create(input: NewNote): Promise<Note>
  remove(id: string): Promise<void>
}
```

```ts
// features/notes/infrastructure/in-memory-notes-repository.ts
import type { NotesRepository } from '../domain/notes-repository'
import type { Note } from '../domain/note'

export function createInMemoryNotesRepository(seed: readonly Note[] = []): NotesRepository {
  let notes = [...seed]
  return {
    list: async () => notes,
    create: async (input) => {
      const note: Note = { ...input, id: crypto.randomUUID(), updatedAt: new Date() }
      notes = [note, ...notes]
      return note
    },
    remove: async (id) => {
      notes = notes.filter((n) => n.id !== id)
    },
  }
}
```

```ts
// features/notes/infrastructure/http-notes-repository.ts
import type { NotesRepository } from '../domain/notes-repository'
// Asume un HttpClient con get/post/delete (extensión del de §18) y parsers (type guards) para cada DTO

type NoteDto = { id: string; title: string; body: string; updated_at: string }

const toNote = (dto: NoteDto) => ({ id: dto.id, title: dto.title, body: dto.body, updatedAt: new Date(dto.updated_at) })

export function createHttpNotesRepository(http: HttpClient): NotesRepository {
  return {
    list: async () => (await http.get('/notes', parseNoteDtoList)).map(toNote),
    create: async (input) => toNote(await http.post('/notes', input, parseNoteDto)),
    remove: async (id) => { await http.delete(`/notes/${id}`) },
  }
}
```

#### Ejemplo 2: El hook depende solo del contrato

```ts
// features/notes/hooks/use-notes.ts
import type { NotesRepository } from '../domain/notes-repository'

export function useNotes(repository: NotesRepository) {
  // … usa repository.list(), repository.create(), sin saber si es HTTP o memoria
}
```

#### Ejemplo 3: Testear sin red

```ts
const repository = createInMemoryNotesRepository([
  { id: '1', title: 'Compras', body: 'Leche', updatedAt: new Date('2026-01-01') },
])
// render(<NotesPage repository={repository} />) → la UI se prueba con datos deterministas
```

🧩 **Ejercicio (es el núcleo del RETO-01):** este contrato **no contempla la cancelación** ni distingue tipos de error. ¿Cómo agregarías la posibilidad de cancelar una búsqueda sin que el contrato mencione `fetch` ni HTTP? ¿Los errores deberían ser excepciones o parte del tipo de retorno?

---

## 22. Inyección de Dependencias

Quien usa una dependencia **la recibe** en lugar de crearla o importarla.

#### Ejemplo 1: Por props

```tsx
function NotesPage({ repository }: { repository: NotesRepository }) {
  const { notes } = useNotes(repository)
  // …
}
```

✅ Explícito y trivial de testear. ❌ *Prop drilling* si la dependencia se necesita muy abajo.

#### Ejemplo 2: Por parámetro de función (sin React)

```ts
export function createNotesService({ repository, tracker }: { repository: NotesRepository; tracker: AnalyticsTracker }) {
  return {
    async createNote(input: NewNote) {
      const note = await repository.create(input)
      tracker.track('note_created')
      return note
    },
  }
}
```

✅ La lógica de aplicación se testea sin React. ❌ Alguien tiene que construir el servicio.

#### Ejemplo 3: Por contexto + Composition Root

El patrón completo de provider + hook con guard está en [§1.5, ejemplo 3](./01-principios.md#15-dip-dependency-inversion-inversión-de-dependencias). La pieza clave es el **Composition Root**: el único lugar que conoce las implementaciones.

```tsx
// app/App.tsx: aquí, y SOLO aquí, se importan adaptadores concretos
const http = createHttpClient({ baseUrl: '/api', getToken })
const notesRepository = import.meta.env.DEV ? createInMemoryNotesRepository(demoNotes) : createHttpNotesRepository(http)

export function App() {
  return (
    <AnalyticsProvider tracker={createAnalyticsTracker(import.meta.env.PROD ? 'production' : 'development')}>
      <NotesRepositoryProvider repository={notesRepository}>
        <AppRoutes />
      </NotesRepositoryProvider>
    </AnalyticsProvider>
  )
}
```

| Vía | Ventajas | Desventajas |
|---|---|---|
| Props | Explícita, testeable | *Prop drilling* |
| Parámetro | Desacoplada de React | Hay que construir |
| Context | Sin *drilling*, un punto de cambio | Implícita; los tests necesitan el provider |

📚 [Mark Seemann: Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/)

---

## 23. Singleton (y por qué evitarlo)

Un módulo de ES se evalúa una sola vez: es un singleton de facto.

#### Ejemplo 1: Singleton mutable global

❌ **Antes**

```ts
// api.ts
export const api = { token: '', baseUrl: '/api' }

// login.tsx
api.token = response.token     // cualquiera lo muta desde cualquier lado

// Test A pone un token y el Test B lo hereda sin saberlo
```

✅ **Después**: se crea en el Composition Root y se inyecta (ver [§22](#22-inyección-de-dependencias)).

#### Ejemplo 2: Singletons aceptables

```ts
// Constantes inmutables: está bien que sean "únicas"
export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

// Un store observable (como el toastStore de §17) es un singleton deliberado.
// Aceptable si es pequeño, transversal y tiene una API controlada (no mutable desde fuera).
```

💡 **Regla:** un singleton **inmutable** está bien. Un singleton **mutable y accesible por todos** es estado global oculto.

📚 [Refactoring.Guru: Catálogo de patrones (en español)](https://refactoring.guru/es/design-patterns/catalog) · [Patterns.dev: Design Patterns](https://www.patterns.dev/vanilla/)

---

[← Parte III: Patrones de componentes](./03-patrones-componentes.md) · [Índice](../ESTUDIO.md) · [Parte V: Arquitectura →](./05-arquitectura.md)
