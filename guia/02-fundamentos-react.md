# Parte II · Fundamentos de React

[← Parte I: Principios](./01-principios.md) · [Índice](../ESTUDIO.md) · [Parte III: Patrones de componentes →](./03-patrones-componentes.md)

> Imports de React omitidos en los ejemplos salvo cuando importan para la idea.

---

## 3. Componentes y props

**Ideas clave**
- **Componentes puros.** Con las mismas props, producen el mismo resultado. No modifican nada externo durante el render.
- **Props de solo lectura.** Si necesitas "cambiarlas", lo que necesitas es estado.
- **Genéricos vs. de dominio:**
  - `Button`, `Card` y `Badge` no conocen el negocio.
  - `InvoiceRow` sí lo conoce, y combina genéricos.
- **`key` estable y única entre hermanos**, normalmente el id.

#### Ejemplo 1: Render impuro

❌ **Antes**: modifica una variable externa durante el render.

```tsx
let renderedCount = 0

function Comment({ text }: { text: string }) {
  renderedCount++ // ❌ efecto secundario en render. En StrictMode se cuenta doble.
  return <p>#{renderedCount} {text}</p>
}
```

✅ **Después**: el dato necesario llega por props.

```tsx
function Comment({ text, position }: { text: string; position: number }) {
  return <p>#{position} {text}</p>
}

{comments.map((comment, index) => (
  <Comment key={comment.id} text={comment.text} position={index + 1} />
))}
```

> Usar `index` para **mostrar** un número de posición está bien. Lo que no debe ser el índice es la `key`.

#### Ejemplo 2: `key` por índice y estado mezclado

❌ **Antes**: cada fila tiene un input no controlado. Al borrar la primera fila, el texto escrito "salta" a la fila de abajo.

```tsx
{todos.map((todo, index) => (
  <li key={index}>
    {todo.title} <input placeholder="Nota rápida" />
    <button type="button" onClick={() => remove(todo.id)}>Borrar</button>
  </li>
))}
```

✅ **Después**

```tsx
{todos.map((todo) => (
  <li key={todo.id}>
    {todo.title} <input placeholder="Nota rápida" />
    <button type="button" onClick={() => remove(todo.id)}>Borrar</button>
  </li>
))}
```

💡 **Por qué:** React asocia el estado interno (DOM, `useState`) a la `key`. Si la `key` es la posición, el estado se queda en la posición y no en el dato.

#### Ejemplo 3: Componente genérico + componente de dominio

```tsx
// shared/ui/stat.tsx: genérico, no sabe qué mide
type StatProps = { label: string; value: ReactNode; trend?: 'up' | 'down' | 'flat' }

function Stat({ label, value, trend = 'flat' }: StatProps) {
  return (
    <div className={`stat stat--${trend}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
```

```tsx
// features/sales/components/monthly-revenue.tsx: de dominio
function MonthlyRevenue({ current, previous }: { current: number; previous: number }) {
  const trend = current > previous ? 'up' : current < previous ? 'down' : 'flat'
  return <Stat label="Ingresos del mes" value={formatCurrency(current)} trend={trend} />
}
```

💡 **Por qué:** `Stat` se reutiliza en cualquier dashboard, y la regla "cómo se calcula la tendencia de ventas" vive en su dominio.

📚 [Tu primer componente](https://react.dev/learn/your-first-component) · [Pasar props](https://react.dev/learn/passing-props-to-a-component) · [Renderizar listas](https://react.dev/learn/rendering-lists) · [Mantener componentes puros](https://react.dev/learn/keeping-components-pure) · [Pensar en React](https://react.dev/learn/thinking-in-react)

---

## 4. Estado

**Ideas clave**
- **Estado mínimo.** Lo que se puede calcular **no** es estado.
- **Fuente única de verdad.** Si dos hermanos comparten un dato, súbelo al ancestro común.
- **Inmutabilidad:**
  - Copia, no mutes.
  - `sort`, `reverse` y `splice` mutan. `toSorted`, `toReversed` y `toSpliced` (ES2023) no.
- **Agrupa el estado que cambia junto.**

#### Ejemplo 1: Estado derivado

❌ **Antes**

```tsx
const [messages, setMessages] = useState<Message[]>([])
const [unreadCount, setUnreadCount] = useState(0)

useEffect(() => {
  setUnreadCount(messages.filter((m) => !m.read).length)
}, [messages]) // render extra + riesgo de desincronización
```

✅ **Después**

```tsx
const [messages, setMessages] = useState<Message[]>([])
const unreadCount = messages.filter((m) => !m.read).length
```

#### Ejemplo 2: Lifting state up

❌ **Antes**: dos hermanos con su propia copia. El selector y la vista previa se desincronizan.

```tsx
function ColorPicker() { const [color, setColor] = useState('#000') /* … */ }
function ColorPreview() { const [color, setColor] = useState('#000') /* … */ }
```

✅ **Después**: el padre es dueño del dato, y los hijos lo reciben y notifican cambios.

```tsx
function ThemeEditor() {
  const [color, setColor] = useState('#1e40af')
  return (
    <>
      <ColorPicker value={color} onValueChange={setColor} />
      <ColorPreview color={color} />
    </>
  )
}

function ColorPicker({ value, onValueChange }: { value: string; onValueChange: (color: string) => void }) {
  return <input type="color" value={value} onChange={(e) => onValueChange(e.target.value)} />
}

function ColorPreview({ color }: { color: string }) {
  return <div className="preview" style={{ backgroundColor: color }} />
}
```

#### Ejemplo 3: Actualizaciones inmutables

```tsx
type Playlist = { name: string; songs: Song[]; settings: { shuffle: boolean; repeat: boolean } }

// ❌ Mutación: React no detecta el cambio (misma referencia)
playlist.songs.push(newSong)
setPlaylist(playlist)

// ✅ Agregar
setPlaylist((current) => ({ ...current, songs: [...current.songs, newSong] }))

// ✅ Quitar
setPlaylist((current) => ({ ...current, songs: current.songs.filter((s) => s.id !== songId) }))

// ✅ Actualizar un elemento
setPlaylist((current) => ({
  ...current,
  songs: current.songs.map((s) => (s.id === songId ? { ...s, liked: !s.liked } : s)),
}))

// ✅ Objeto anidado
setPlaylist((current) => ({ ...current, settings: { ...current.settings, shuffle: !current.settings.shuffle } }))

// ✅ Ordenar SIN mutar (para mostrar, ni siquiera hace falta estado)
const songsByTitle = playlist.songs.toSorted((a, b) => a.title.localeCompare(b.title))
```

#### Ejemplo 4: Resetear estado con `key`

❌ **Antes**: un efecto para limpiar el borrador cuando cambia el contacto.

```tsx
function ChatInput({ contactId }: { contactId: string }) {
  const [draft, setDraft] = useState('')
  useEffect(() => { setDraft('') }, [contactId])
  // …
}
```

✅ **Después**: una `key` distinta crea una instancia nueva con estado nuevo.

```tsx
<ChatInput key={contactId} contactId={contactId} />
```

🏋️ **Practica:** en un componente tuyo, lista cada `useState` y pregúntate si se puede calcular con los demás. Si la respuesta es sí, elimínalo.

📚 [El estado: la memoria de un componente](https://react.dev/learn/state-a-components-memory) · [Elegir la estructura del estado](https://react.dev/learn/choosing-the-state-structure) · [Compartir estado](https://react.dev/learn/sharing-state-between-components) · [Preservar y reiniciar el estado](https://react.dev/learn/preserving-and-resetting-state) · [Actualizar arreglos](https://react.dev/learn/updating-arrays-in-state)

---

## 5. Efectos y datos asíncronos

**Ideas clave**
- **Un efecto sincroniza con un sistema externo** (red, storage, timers, suscripciones o el DOM). Sin un sistema externo, no hay efecto.
- **El cleanup** deshace lo que hizo el efecto: desuscribirse, limpiar timers o descartar respuestas obsoletas.
- **StrictMode** ejecuta los efectos dos veces en desarrollo. Si se rompe algo, falta cleanup.

| Situación | ¿Efecto? | Alternativa |
|---|---|---|
| Calcular un valor a partir de props o estado | ❌ | Calcular en el render |
| Responder a un clic o envío | ❌ | Manejador del evento |
| Resetear estado cuando cambia una prop | ❌ | `key` |
| Suscribirse a un evento del navegador | ✅ | o `useSyncExternalStore` |
| Pedir datos al montar o cuando cambia un id | ✅ | o una librería de *server state* |
| Sincronizar con un widget que no es de React | ✅ | |

#### Ejemplo 1: Lógica de evento dentro de un efecto

❌ **Antes**

```tsx
const [shouldSave, setShouldSave] = useState(false)

useEffect(() => {
  if (shouldSave) {
    saveDraft(text)
    showToast('Guardado')
    setShouldSave(false)
  }
}, [shouldSave, text])

<button type="button" onClick={() => setShouldSave(true)}>Guardar</button>
```

✅ **Después**

```tsx
function handleSave() {
  saveDraft(text)
  showToast('Guardado')
}

<button type="button" onClick={handleSave}>Guardar</button>
```

#### Ejemplo 2: Suscripción con cleanup

```tsx
function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize) // ✅ sin fugas
  }, [])

  return width
}
```

```tsx
function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback // siempre la versión más reciente, sin reiniciar el timer
  }, [callback])

  useEffect(() => {
    if (delayMs === null) return // pausado
    const id = window.setInterval(() => savedCallback.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs])
}
```

#### Ejemplo 3: Pedir datos sin condición de carrera

Si el usuario cambia rápido de perfil (A → B), la respuesta de A puede llegar **después** que la de B, y mostrar datos equivocados.

❌ **Antes**

```tsx
useEffect(() => {
  fetchProfile(profileId).then(setProfile) // ❌ la última respuesta en llegar gana, no la última pedida
}, [profileId])
```

✅ **Después (opción A)**: una bandera de "ignorar" (es el patrón que documenta react.dev).

```tsx
useEffect(() => {
  let ignore = false

  fetchProfile(profileId).then((result) => {
    if (!ignore) setProfile(result)
  })

  return () => {
    ignore = true // la respuesta de la petición anterior se descarta
  }
}, [profileId])
```

✅ **Después (opción B)**: cancelar de verdad la petición.

```tsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/profiles/${profileId}`, { signal: controller.signal })
    .then((response) => response.json())
    .then(setProfile)
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return // cancelación esperada
      setError(error)
    })

  return () => controller.abort()
}, [profileId])
```

💡 **Diferencia:** la opción A ignora la respuesta, pero la petición sigue viajando. La opción B la corta y ahorra red. Pregunta de diseño: si la petición está detrás de una abstracción (un repositorio), ¿cómo le comunicas la cancelación sin acoplarla a `fetch`?

🏋️ **Practica:** busca cada `useEffect` de tu proyecto y anota con qué sistema externo sincroniza. Si no encuentras ninguno, probablemente sobra.

📚 [Sincronizar con efectos](https://react.dev/learn/synchronizing-with-effects) · [Quizás no necesites un efecto](https://react.dev/learn/you-might-not-need-an-effect) · [Ciclo de vida de los efectos](https://react.dev/learn/lifecycle-of-reactive-effects) · [useEffect: obtener datos](https://react.dev/reference/react/useEffect#fetching-data-with-effects)

---

## 6. Custom hooks

**Ideas clave**
- Reutilizan **lógica con estado**, no el estado. Cada uso tiene su propia copia.
- **API:**
  - Devuelve un objeto si hay varios valores.
  - Devuelve una tupla solo si imita a `useState`.
  - Expón acciones con **intención**.
- **Reglas de los hooks:** solo en el nivel superior, nunca en condiciones ni bucles.

#### Ejemplo 1: Acciones con intención en vez de setter crudo

❌ **Antes**

```tsx
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  return { count, setCount } // el consumidor puede poner cualquier valor, incluso negativo
}
```

✅ **Después**

```tsx
function useCounter({ initial = 0, min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const [count, setCount] = useState(initial)

  return {
    count,
    increment: () => setCount((c) => Math.min(c + 1, max)),
    decrement: () => setCount((c) => Math.max(c - 1, min)),
    reset: () => setCount(initial),
    isAtMin: count === min,
    isAtMax: count === max,
  }
}
```

💡 **Por qué:** las invariantes (`min` y `max`) se protegen dentro del hook. Ningún consumidor puede romperlas.

#### Ejemplo 2: Hook que encapsula una API del navegador

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mediaQueryList.matches) // por si la query cambió
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

// Uso con nombre de negocio
function useIsMobile() {
  return useMediaQuery('(max-width: 640px)')
}
```

#### Ejemplo 3: Hook genérico tipado

```tsx
function useSelection<T extends { id: string }>(items: readonly T[]) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedItems = items.filter((item) => selectedIds.has(item.id)) // derivado

  return {
    selectedItems,
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    clear: () => setSelectedIds(new Set()),
    selectAll: () => setSelectedIds(new Set(items.map((i) => i.id))),
  }
}

// const { selectedItems } = useSelection(employees) → selectedItems es Employee[]
```

**Antipatrones**

```tsx
// ❌ Un "hook" que devuelve JSX: eso es un componente
function useUserCard(user: User) { return <div>{user.name}</div> }

// ❌ Un "hook" sin hooks adentro: es una función normal, llámala formatX o getX
function useFormattedPrice(price: number) { return `$${price.toFixed(2)}` }
```

🏋️ **Practica:** extrae a un custom hook la lógica de cualquier componente con dos o más `useState` relacionados, y exponla con acciones con nombre de intención.

📚 [Reutilizar lógica con custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) · [Reglas de los hooks](https://react.dev/reference/rules/rules-of-hooks)

---

## 7. useReducer + Context (Provider Pattern)

**Ideas clave**
- **`useReducer`:**
  - Úsalo cuando hay varias transiciones con reglas.
  - El reducer es **puro**: sin I/O, sin `Date.now()`, sin ids aleatorios y sin mutar.
  - Las acciones son una **unión discriminada**.
- **Context:**
  - Es **transporte**, no un gestor de estado.
  - Expón un hook con **guard** y no exportes el contexto crudo.
- **React 19:** el contexto se renderiza directamente como provider.

#### Ejemplo 1: Reducer de un asistente de onboarding

```ts
type OnboardingStep = 'profile' | 'preferences' | 'confirm'

type OnboardingState = { step: OnboardingStep; displayName: string; newsletter: boolean }

type OnboardingAction =
  | { type: 'displayNameChanged'; displayName: string }
  | { type: 'newsletterToggled' }
  | { type: 'nextStep' }
  | { type: 'previousStep' }

const stepOrder: readonly OnboardingStep[] = ['profile', 'preferences', 'confirm']

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'displayNameChanged':
      return { ...state, displayName: action.displayName }
    case 'newsletterToggled':
      return { ...state, newsletter: !state.newsletter }
    case 'nextStep': {
      if (state.displayName.trim() === '') return state // regla centralizada
      const next = stepOrder[stepOrder.indexOf(state.step) + 1]
      return next ? { ...state, step: next } : state
    }
    case 'previousStep': {
      const previous = stepOrder[stepOrder.indexOf(state.step) - 1]
      return previous ? { ...state, step: previous } : state
    }
    default: {
      const unhandled: never = action // error de compilación si olvidas un caso
      return unhandled
    }
  }
}
```

```tsx
function OnboardingWizard() {
  const [state, dispatch] = useReducer(onboardingReducer, {
    step: 'profile',
    displayName: '',
    newsletter: false,
  })
  // El componente DESCRIBE intención; no calcula el siguiente paso
  return <button type="button" onClick={() => dispatch({ type: 'nextStep' })}>Continuar</button>
}
```

#### Ejemplo 2: Tema con Context (React 19)

```ts
// theme-context.ts: sin JSX, para no romper Fast Refresh
export type Theme = 'light' | 'dark'
export type ThemeContextValue = { theme: Theme; toggleTheme: () => void }

export const ThemeContext = createContext<ThemeContextValue | null>(null)
```

```tsx
// theme-provider.tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
```

```ts
// use-theme.ts
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>.')
  return context
}
```

💡 `useMemo` en el `value` evita que todos los consumidores se re-rendericen cuando el provider se re-renderiza por otro motivo (el proyecto no usa React Compiler).

#### Ejemplo 3: Separar estado y `dispatch` (rendimiento + ISP)

Componentes como "botón de cerrar notificación" solo **despachan** y no necesitan re-renderizarse cuando cambia la lista.

```ts
// notifications-context.ts
export const NotificationsStateContext = createContext<readonly AppNotification[] | null>(null)
export const NotificationsDispatchContext = createContext<Dispatch<NotificationsAction> | null>(null)
```

```tsx
// notifications-provider.tsx
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, dispatch] = useReducer(notificationsReducer, [])

  return (
    <NotificationsDispatchContext value={dispatch}>
      <NotificationsStateContext value={notifications}>{children}</NotificationsStateContext>
    </NotificationsDispatchContext>
  )
}
```

```ts
// hooks: cada consumidor elige lo mínimo que necesita
export function useNotifications() { /* lee State + guard */ }
export function useNotificationActions() {
  /* lee Dispatch + guard, devuelve { dismiss(id), dismissAll() } */
}
```

💡 `dispatch` tiene identidad estable, así que los consumidores de `NotificationsDispatchContext` nunca se re-renderizan por cambios en la lista.

**Persistencia:** guardar en `localStorage` es un efecto, **fuera** del reducer. Al leer, valida los datos (ver *type guards* en [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)).

🏋️ **Practica:** convierte un componente con 3 o más `useState` que cambian juntos en un `useReducer`. Escribe primero el tipo de las acciones y después el reducer.

📚 [Extraer lógica en un reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) · [Pasar datos con Context](https://react.dev/learn/passing-data-deeply-with-context) · [Escalar con reducer + context](https://react.dev/learn/scaling-up-with-reducer-and-context) · [createContext](https://react.dev/reference/react/createContext)

---

[← Parte I: Principios](./01-principios.md) · [Índice](../ESTUDIO.md) · [Parte III: Patrones de componentes →](./03-patrones-componentes.md)
