# Parte VI · Buenas prácticas

[← Parte V: Arquitectura](./05-arquitectura.md) · [Índice](../ESTUDIO.md) · [Parte VII: Checklist y referencias →](./07-checklist-y-referencias.md)

---

## 30. TypeScript aplicado a React

#### Ejemplo 1: Extender las props nativas

```tsx
import type { ComponentProps } from 'react'

// ✅ Acepta TODAS las props de <textarea> (rows, maxLength, aria-*, ref en React 19…)
type TextAreaFieldProps = ComponentProps<'textarea'> & { label: string; error?: string }

function TextAreaField({ label, error, id, ...textareaProps }: TextAreaFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div>
      <label htmlFor={fieldId}>{label}</label>
      <textarea id={fieldId} aria-invalid={error ? true : undefined} {...textareaProps} />
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
```

#### Ejemplo 2: Alternativas a `enum` (el proyecto usa `erasableSyntaxOnly`)

```ts
// ❌ No compila en este proyecto
enum OrderStatus { Pending, Shipped, Delivered }

// ✅ Unión de literales: lo más simple
type OrderStatus = 'pending' | 'shipped' | 'delivered'

// ✅ Objeto as const: cuando también necesitas los valores en runtime (para listarlos o recorrerlos)
const ORDER_STATUSES = ['pending', 'shipped', 'delivered'] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

// ✅ Mapa con etiquetas: satisfies valida que estén todas, sin perder los tipos literales
const orderStatusLabels = {
  pending: 'Pendiente',
  shipped: 'Enviado',
  delivered: 'Entregado',
} as const satisfies Record<OrderStatus, string>
```

#### Ejemplo 3: Type guards para datos externos (en lugar de `as`)

```ts
type Preferences = { language: 'es' | 'en'; emailDigest: boolean }

// ❌ Mentirle al compilador: si el JSON está corrupto, el error aparece lejos de aquí
const preferences = JSON.parse(raw) as Preferences

// ✅ Verificar en runtime y estrechar el tipo
function isPreferences(value: unknown): value is Preferences {
  return (
    typeof value === 'object' &&
    value !== null &&
    'language' in value &&
    (value.language === 'es' || value.language === 'en') &&
    'emailDigest' in value &&
    typeof value.emailDigest === 'boolean'
  )
}

const parsed: unknown = JSON.parse(raw)
const preferences = isPreferences(parsed) ? parsed : DEFAULT_PREFERENCES
```

> Para esquemas grandes, una librería de validación (Zod, Valibot) genera el validador y el tipo a la vez.

#### Ejemplo 4: Exhaustividad con `never`

```ts
type PaymentMethod =
  | { kind: 'card'; last4: string }
  | { kind: 'transfer'; bank: string }
  | { kind: 'wallet'; provider: 'paypal' | 'mercadopago' }

function describePayment(method: PaymentMethod): string {
  switch (method.kind) {
    case 'card': return `Tarjeta terminada en ${method.last4}`
    case 'transfer': return `Transferencia desde ${method.bank}`
    case 'wallet': return `Billetera ${method.provider}`
    default: {
      const unhandled: never = method // agregar { kind: 'crypto' } produce error AQUÍ
      throw new Error(`Método no soportado: ${JSON.stringify(unhandled)}`)
    }
  }
}
```

#### Ejemplo 5: Componente genérico

```tsx
type SelectProps<T> = {
  label: string
  options: readonly T[]
  value: T
  onValueChange: (value: T) => void
  getLabel: (option: T) => string
  getKey: (option: T) => string
}

function Select<T>({ label, options, value, onValueChange, getLabel, getKey }: SelectProps<T>) {
  const selectId = useId()
  return (
    <>
      <label htmlFor={selectId}>{label}</label>
      <select
        id={selectId}
        value={getKey(value)}
        onChange={(event) => {
          const selected = options.find((o) => getKey(o) === event.target.value)
          if (selected !== undefined) onValueChange(selected)
        }}
      >
        {options.map((option) => (
          <option key={getKey(option)} value={getKey(option)}>{getLabel(option)}</option>
        ))}
      </select>
    </>
  )
}

// onValueChange recibe Country, no string
<Select label="País" options={countries} value={country} onValueChange={setCountry}
        getKey={(c) => c.code} getLabel={(c) => c.name} />
```

#### Ejemplo 6: `import type` (obligatorio por `verbatimModuleSyntax`)

```ts
// ❌ Error: 'User' es un tipo y debe importarse con import type
import { User } from './user'

// ✅
import type { User } from './user'
import { formatUser, type UserRole } from './user' // mixto: valor + tipo
```

📚 [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) · [TS: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) · [TS: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) · [TS: satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)

---

## 31. Rendimiento

**Primero mide** (con el Profiler de React DevTools) y **después** optimiza. Las causas más comunes de lentitud son **estructurales**.

#### Ejemplo 1: Bajar el estado (colocation)

❌ **Antes**: escribir en el buscador re-renderiza el gráfico pesado.

```tsx
function Dashboard() {
  const [query, setQuery] = useState('')
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SearchResults query={query} />
      <ExpensiveChart /> {/* se re-renderiza en cada tecla */}
    </>
  )
}
```

✅ **Después**

```tsx
function Dashboard() {
  return (
    <>
      <SearchSection /> {/* el estado del input vive aquí adentro */}
      <ExpensiveChart />
    </>
  )
}
```

#### Ejemplo 2: Subir el contenido (`children`)

```tsx
// El estado de scroll cambia muchas veces por segundo, pero `children` lo crea el PADRE,
// así que React no re-renderiza ese contenido cuando cambia scrollY.
function ScrollTracker({ children }: { children: ReactNode }) {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div>
      <ProgressBar value={scrollY} />
      {children}
    </div>
  )
}

<ScrollTracker>
  <LongArticle /> {/* no se re-renderiza al hacer scroll */}
</ScrollTracker>
```

#### Ejemplo 3: `memo` + `useCallback`, cuando sí corresponde

```tsx
// Una fila costosa en una lista de 2.000 elementos
const InvoiceRow = memo(function InvoiceRow({ invoice, onSelect }: InvoiceRowProps) {
  /* render costoso */
})

function InvoiceTable({ invoices }: { invoices: readonly Invoice[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sin useCallback, cada render crea una función nueva y memo no sirve
  const handleSelect = useCallback((id: string) => setSelectedId(id), [])

  return invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onSelect={handleSelect} />)
}
```

⚠️ `memo` sin referencias estables **no hace nada**. Y `useMemo`/`useCallback` en todo es ruido. Úsalos donde mediste un problema.

#### Ejemplo 4: `useDeferredValue` para mantener la UI fluida

```tsx
function ProductSearch({ products }: { products: readonly Product[] }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query) // el input responde de inmediato; la lista "va detrás"
  const results = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [products, deferredQuery],
  )
  const isStale = query !== deferredQuery

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul style={{ opacity: isStale ? 0.6 : 1 }}>{/* results */}</ul>
    </>
  )
}
```

📚 [memo](https://react.dev/reference/react/memo) · [useMemo](https://react.dev/reference/react/useMemo) · [useDeferredValue](https://react.dev/reference/react/useDeferredValue) · [Dan Abramov: Before You memo()](https://overreacted.io/before-you-memo/)

---

## 32. Manejo de errores

#### Ejemplo 1: Error Boundary

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = { fallback: ReactNode; children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render capturado', error, info.componentStack) // o un servicio de logging
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
```

```tsx
// Boundaries por zonas: si falla el widget de recomendaciones, el resto sigue funcionando
<Layout>
  <MainContent />
  <ErrorBoundary fallback={<p>No pudimos cargar las recomendaciones.</p>}>
    <Recommendations />
  </ErrorBoundary>
</Layout>
```

> Los Error Boundaries **no** capturan errores en manejadores de eventos ni en código asíncrono. Esos errores van al estado.

#### Ejemplo 2: Errores asíncronos en el estado, con recuperación

```tsx
function InvoiceDownload({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<
    { status: 'idle' } | { status: 'downloading' } | { status: 'failed'; message: string }
  >({ status: 'idle' })

  async function handleDownload() {
    setState({ status: 'downloading' })
    try {
      await invoicesService.download(invoiceId)
      setState({ status: 'idle' })
    } catch {
      setState({ status: 'failed', message: 'No se pudo descargar la factura. Revisa tu conexión.' })
    }
  }

  return (
    <>
      <button type="button" onClick={handleDownload} disabled={state.status === 'downloading'}>
        {state.status === 'downloading' ? 'Descargando…' : 'Descargar factura'}
      </button>
      {state.status === 'failed' && <p role="alert">{state.message}</p>}
    </>
  )
}
```

#### Ejemplo 3: Errores como valores (tipo `Result`)

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

type TransferError = 'insufficient_funds' | 'account_blocked' | 'network'

async function transfer(amount: number): Promise<Result<{ receiptId: string }, TransferError>> {
  // … nunca lanza; los errores esperables son parte del tipo
}

const result = await transfer(100)
if (!result.ok) {
  // TypeScript conoce los 3 errores posibles: puedes mostrar un mensaje específico para cada uno
}
```

💡 Las **excepciones** sirven para lo inesperado (bugs). Los **errores de negocio esperables** quedan más claros como parte del tipo de retorno.

📚 [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) · [react-error-boundary](https://github.com/bvaughn/react-error-boundary)

---

## 33. Accesibilidad

#### Ejemplo 1: Elemento semántico

```tsx
// ❌ No se puede enfocar con Tab, no responde a Enter/Espacio y el lector no lo anuncia como botón
<div className="btn" onClick={archive}>Archivar</div>

// ✅
<button type="button" className="btn" onClick={archive}>Archivar</button>
```

#### Ejemplo 2: Botón de solo ícono y estados

```tsx
// ❌ Un lector de pantalla dice solo "botón"
<button type="button" onClick={toggleFavorite}><HeartIcon /></button>

// ✅ Tiene nombre accesible y comunica su estado
<button
  type="button"
  onClick={toggleFavorite}
  aria-label="Agregar a favoritos"
  aria-pressed={isFavorite}
>
  <HeartIcon aria-hidden="true" />
</button>
```

#### Ejemplo 3: Anunciar cambios dinámicos

```tsx
// Los usuarios de lector de pantalla no "ven" que la lista se actualizó
<p role="status" aria-live="polite">
  {results.length === 0 ? 'Sin resultados' : `${results.length} resultados encontrados`}
</p>
```

#### Ejemplo 4: Gestión del foco con `<dialog>`

```tsx
function ConfirmDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal() // atrapa el foco y bloquea el fondo
    if (!open && dialog.open) dialog.close()     // el navegador devuelve el foco al disparador
  }, [open])

  return (
    <dialog ref={dialogRef} onClose={onClose}> {/* Escape dispara onClose */}
      {children}
    </dialog>
  )
}
```

**Checklist rápido:**
- [ ] Cada input tiene un `<label>`.
- [ ] Las imágenes tienen `alt` (o `alt=""` si son decorativas).
- [ ] Todo se puede usar con el teclado.
- [ ] El foco es visible.
- [ ] El contraste es suficiente.
- [ ] Los encabezados siguen un orden lógico.

📚 [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) · [MDN: Accesibilidad](https://developer.mozilla.org/es/docs/Web/Accessibility) · [MDN: `<dialog>`](https://developer.mozilla.org/es/docs/Web/HTML/Element/dialog)

---

## 34. Testing

> El proyecto **no** tiene un test runner instalado. El stack sugerido es Vitest + Testing Library + `@testing-library/user-event` + `@testing-library/jest-dom`. Los ejemplos son ilustrativos.

#### Ejemplo 1: Funciones puras (el test más barato)

```ts
import { describe, expect, it } from 'vitest'

describe('finalPrice', () => {
  it('aplica 10 % de descuento a pro', () => {
    expect(finalPrice(100, 'pro')).toBe(90)
  })

  it('nunca devuelve un precio negativo', () => {
    expect(finalPrice(3, 'enterprise')).toBe(0)
  })
})
```

#### Ejemplo 2: Comportamiento, no implementación

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('muestra el panel al hacer clic en la pregunta', async () => {
  const user = userEvent.setup()
  render(<FaqItem question="¿Hacen envíos?" answer="Sí, a todo el país." />)

  expect(screen.queryByText('Sí, a todo el país.')).not.toBeVisible()

  await user.click(screen.getByRole('button', { name: '¿Hacen envíos?' }))

  expect(screen.getByText('Sí, a todo el país.')).toBeVisible()
})

// ❌ Probar detalles internos: se rompe al refactorizar aunque el usuario no note nada
// expect(component.state.isOpen).toBe(true)
// expect(container.querySelector('.faq__panel--open')).toBeTruthy()
```

#### Ejemplo 3: Test de UI con un repositorio en memoria (gracias a DIP)

```tsx
it('lista las notas del repositorio', async () => {
  const repository = createInMemoryNotesRepository([
    { id: '1', title: 'Compras', body: 'Leche', updatedAt: new Date('2026-01-01') },
  ])

  render(<NotesPage repository={repository} />)

  expect(await screen.findByRole('heading', { name: 'Compras' })).toBeInTheDocument()
})
// Sin vi.mock, sin interceptar fetch y sin red.
```

📚 [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles) · [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) · [Vitest](https://vitest.dev/guide/)

---

## 35. Convenciones de nombres y organización

| Elemento | Convención | ❌ | ✅ |
|---|---|---|---|
| Componente | PascalCase, sustantivo | `renderUser`, `UserComp` | `UserCard` |
| Hook | `use` + concepto | `getUsersHook` | `useUsers` |
| Handler interno | `handle` + evento | `click`, `doSubmit` | `handleSubmit` |
| Prop de callback | `on` + evento | `submitFn`, `callback` | `onSubmit`, `onValueChange` |
| Booleano | `is`, `has`, `can`, `should` | `open`, `loading`, `error` | `isOpen`, `isLoading`, `hasError` |
| Acción de reducer | Evento o intención | `SET_DATA`, `update` | `itemAdded`, `filtersReset` |
| Tipo de props | `<Componente>Props` | `IProps`, `Props1` | `UserCardProps` |
| Archivo | Una convención para todo el proyecto | `UserCard.tsx` y `user-list.tsx` mezclados | todo en kebab-case |
| Constante | UPPER_SNAKE_CASE si es configuración | `100` suelto en el código | `MAX_RETRIES = 3` |

#### Ejemplo: nombres que cuentan la historia

```tsx
// ❌
const [d, setD] = useState(false)
const fn = () => setD(!d)
const data2 = data.filter((x) => x.s === 1)

// ✅
const [isDetailsOpen, setIsDetailsOpen] = useState(false)
const toggleDetails = () => setIsDetailsOpen((open) => !open)
const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'active')
```

**Orden sugerido dentro de un componente:**
1. Hooks de contexto y datos.
2. Estado local.
3. Valores derivados.
4. Efectos.
5. Handlers.
6. Returns tempranos (loading, error).
7. JSX.

**Comentarios:** explican el **porqué** ("Safari no dispara `change` aquí, por eso usamos `input`"), no el **qué** ("incrementa el contador").

---

[← Parte V: Arquitectura](./05-arquitectura.md) · [Índice](../ESTUDIO.md) · [Parte VII: Checklist y referencias →](./07-checklist-y-referencias.md)
