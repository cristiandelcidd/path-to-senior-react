# Parte III · Patrones de componentes

[← Parte II: Fundamentos](./02-fundamentos-react.md) · [Índice](../ESTUDIO.md) · [Parte IV: Patrones de diseño →](./04-patrones-diseno.md)

> Imports de React omitidos salvo cuando importan para la idea.
> En los patrones que evalúan los retos (Compound, Polymorphic, Controlado/No controlado), los ejemplos enseñan **la mecánica completa** en otro dominio, pero dejan marcadas como 🧩 **ejercicio** las piezas exactas que pide cada reto.

---

## 8. Contenedor / Presentacional

- **Presentacional:** recibe todo por props y decide *cómo se ve*.
- **Contenedor:** decide *qué datos* y *qué pasa*. Usa hooks y pasa props.

#### Ejemplo 1: Panel de notificaciones

```tsx
// Contenedor
function NotificationsPanel() {
  const { notifications } = useNotifications()
  const { markAsRead } = useNotificationActions()
  return <NotificationList items={notifications} onItemClick={markAsRead} />
}

// Presentacional: se puede previsualizar con datos falsos, sin providers
type NotificationListProps = { items: readonly AppNotification[]; onItemClick: (id: string) => void }

function NotificationList({ items, onItemClick }: NotificationListProps) {
  if (items.length === 0) return <p>No tienes notificaciones</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <button type="button" onClick={() => onItemClick(item.id)}>{item.title}</button>
        </li>
      ))}
    </ul>
  )
}
```

#### Ejemplo 2: Vista que representa todos los estados

El presentacional recibe el **estado completo** (unión discriminada) y pinta cada caso. El contenedor solo lo conecta.

```tsx
type RequestState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

type TeamMembersViewProps = { state: RequestState<readonly Member[]>; onRetry: () => void }

function TeamMembersView({ state, onRetry }: TeamMembersViewProps) {
  switch (state.status) {
    case 'loading':
      return <Spinner label="Cargando equipo" />
    case 'error':
      return (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={onRetry}>Reintentar</button>
        </div>
      )
    case 'success':
      return <MemberGrid members={state.data} />
  }
}

function TeamMembers({ teamId }: { teamId: string }) {
  const { state, retry } = useTeamMembers(teamId)
  return <TeamMembersView state={state} onRetry={retry} />
}
```

💡 **Por qué:** puedes mostrar los tres estados en Storybook o en tests sin simular la red.

#### Ejemplo 3: Cuándo NO separar

```tsx
// Un componente diminuto, sin datos externos ni reutilización: separarlo es ceremonia (KISS)
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }
  return <button type="button" onClick={handleCopy}>{copied ? 'Copiado' : 'Copiar'}</button>
}
```

📚 [Patterns.dev: Container/Presentational](https://www.patterns.dev/react/presentational-container-pattern)

---

## 9. Headless UI y Prop Getters

- **Headless:** comportamiento (estado, teclado, ARIA) sin apariencia. Normalmente es un hook.
- **Prop getters:** funciones que devuelven las props de un elemento y **componen** las del consumidor.

#### Ejemplo 1: `useDisclosure` (mostrar/ocultar)

```tsx
function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const panelId = useId()

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    getToggleProps: () => ({
      'aria-expanded': isOpen,
      'aria-controls': panelId,
      onClick: () => setIsOpen((current) => !current),
    }),
    getPanelProps: () => ({ id: panelId, hidden: !isOpen }),
  }
}

// El consumidor decide 100 % del markup y el estilo
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const { getToggleProps, getPanelProps } = useDisclosure()
  return (
    <div className="faq">
      <button type="button" {...getToggleProps()}>{question}</button>
      <p {...getPanelProps()}>{answer}</p>
    </div>
  )
}
```

#### Ejemplo 2: Prop getters que componen handlers

Problema del ejemplo 1: si el consumidor pasa su propio `onClick`, **pisa** el interno y el toggle deja de funcionar.

```tsx
function callAll<Args extends unknown[]>(...fns: Array<((...args: Args) => void) | undefined>) {
  return (...args: Args) => fns.forEach((fn) => fn?.(...args))
}

function useSwitch({ initialOn = false } = {}) {
  const [isOn, setIsOn] = useState(initialOn)
  const toggle = () => setIsOn((v) => !v)

  function getSwitchProps({ onClick, ...rest }: ComponentProps<'button'> = {}) {
    return {
      type: 'button' as const,
      role: 'switch',
      'aria-checked': isOn,
      onClick: callAll(onClick, toggle), // ✅ se ejecutan ambos
      ...rest,
    }
  }

  return { isOn, toggle, getSwitchProps }
}

function NotificationsToggle({ onTrack }: { onTrack: (event: string) => void }) {
  const { isOn, getSwitchProps } = useSwitch()
  return (
    <button {...getSwitchProps({ onClick: () => onTrack('notifications_toggled'), className: 'switch' })}>
      Notificaciones: {isOn ? 'Activadas' : 'Desactivadas'}
    </button>
  )
}
```

#### Ejemplo 3: Paginación headless

```tsx
type PaginationOptions = { totalItems: number; pageSize: number; initialPage?: number }

function usePagination({ totalItems, pageSize, initialPage = 1 }: PaginationOptions) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const [page, setPage] = useState(initialPage)
  const currentPage = Math.min(page, totalPages) // derivado: se corrige solo si cambian los totales

  const goTo = (target: number) => setPage(Math.min(Math.max(1, target), totalPages))

  return {
    currentPage,
    totalPages,
    pageItemsRange: { start: (currentPage - 1) * pageSize, end: currentPage * pageSize },
    getPreviousProps: () => ({
      onClick: () => goTo(currentPage - 1),
      disabled: currentPage === 1,
      'aria-label': 'Página anterior',
    }),
    getNextProps: () => ({
      onClick: () => goTo(currentPage + 1),
      disabled: currentPage === totalPages,
      'aria-label': 'Página siguiente',
    }),
    getPageProps: (pageNumber: number) => ({
      onClick: () => goTo(pageNumber),
      'aria-current': pageNumber === currentPage ? ('page' as const) : undefined,
    }),
  }
}

// Dos UIs totalmente distintas con la misma lógica: botones numerados en desktop,
// solo "anterior/siguiente" en mobile.
```

🏋️ **Practica:** convierte un componente "con lógica y estilos" tuyo en un hook headless + dos componentes visuales distintos que lo usen.

📚 [Martin Fowler: Headless Component](https://martinfowler.com/articles/headless-component.html) · [Kent C. Dodds: Prop Getters](https://kentcdodds.com/blog/how-to-give-rendering-control-to-users-with-prop-getters) · [React Aria](https://react-spectrum.adobe.com/react-aria/)

---

## 10. Compound Components

- Son varios componentes que **trabajan juntos** y comparten estado implícito por un **contexto privado**.
- **Cuándo:** hay varias partes cuyo orden o contenido varía.
- **Cuándo NO:** la estructura nunca varía. Ahí basta con una prop `items`.

#### Ejemplo 1: Acordeón (uno abierto a la vez), modo no controlado

```ts
// accordion-context.ts: privado, NO se exporta en el barrel
type AccordionContextValue = {
  openValue: string | null
  toggle: (value: string) => void
  baseId: string
}

export const AccordionContext = createContext<AccordionContextValue | null>(null)

export function useAccordionContext(partName: string): AccordionContextValue {
  const context = useContext(AccordionContext)
  if (!context) throw new Error(`<Accordion.${partName}> debe usarse dentro de <Accordion.Root>.`)
  return context
}

// Contexto de cada item, para que Trigger y Panel sepan a qué item pertenecen
export const AccordionItemContext = createContext<string | null>(null)

export function useAccordionItemValue(partName: string): string {
  const value = useContext(AccordionItemContext)
  if (value === null) throw new Error(`<Accordion.${partName}> debe usarse dentro de <Accordion.Item>.`)
  return value
}
```

```tsx
// accordion.tsx
function Root({ defaultValue = null, children }: { defaultValue?: string | null; children: ReactNode }) {
  const [openValue, setOpenValue] = useState<string | null>(defaultValue)
  const baseId = useId()

  const value = useMemo(
    () => ({
      openValue,
      baseId,
      toggle: (itemValue: string) => setOpenValue((current) => (current === itemValue ? null : itemValue)),
    }),
    [openValue, baseId],
  )

  return <AccordionContext value={value}><div className="accordion">{children}</div></AccordionContext>
}

function Item({ value, children }: { value: string; children: ReactNode }) {
  useAccordionContext('Item') // valida que está dentro de Root
  return <AccordionItemContext value={value}><div className="accordion__item">{children}</div></AccordionItemContext>
}

function Trigger({ children }: { children: ReactNode }) {
  const { openValue, toggle, baseId } = useAccordionContext('Trigger')
  const itemValue = useAccordionItemValue('Trigger')
  const isOpen = openValue === itemValue

  return (
    <h3>
      <button
        type="button"
        id={`${baseId}-trigger-${itemValue}`}
        aria-expanded={isOpen}
        aria-controls={`${baseId}-panel-${itemValue}`}
        onClick={() => toggle(itemValue)}
      >
        {children}
      </button>
    </h3>
  )
}

function Panel({ children }: { children: ReactNode }) {
  const { openValue, baseId } = useAccordionContext('Panel')
  const itemValue = useAccordionItemValue('Panel')

  return (
    <div
      role="region"
      id={`${baseId}-panel-${itemValue}`}
      aria-labelledby={`${baseId}-trigger-${itemValue}`}
      hidden={openValue !== itemValue}
    >
      {children}
    </div>
  )
}

export const Accordion = { Root, Item, Trigger, Panel }
```

```tsx
// Uso: el consumidor controla estructura y contenido
<Accordion.Root defaultValue="shipping">
  <Accordion.Item value="shipping">
    <Accordion.Trigger>¿Cuánto tarda el envío?</Accordion.Trigger>
    <Accordion.Panel>Entre 2 y 5 días hábiles.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <Accordion.Trigger><RefundIcon /> ¿Puedo devolver un pedido?</Accordion.Trigger>
    <Accordion.Panel>Sí, dentro de 30 días. <a href="/devoluciones">Ver política</a></Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>
```

🧩 **Ejercicio (no incluido a propósito):**
- Agregar el **modo controlado** (`value` + `onValueChange`, ver [§13](#13-controlado--no-controlado)).
- Agregar **navegación con teclado** entre triggers (↑ ↓ Home End) según WAI-ARIA.
- Pregunta: ¿cómo sabe un trigger cuál es "el siguiente" si el consumidor puede intercalar markup arbitrario entre ellos?

#### Ejemplo 2: Diálogo con partes que se conectan por ids

Aquí el contexto no comparte estado de "abierto/cerrado", sino **ids** para la accesibilidad: `Title` y `Description` le dan nombre y descripción al diálogo sin que el consumidor maneje ids.

```tsx
type DialogContextValue = { titleId: string; descriptionId: string; onClose: () => void }
const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(partName: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`<Dialog.${partName}> debe usarse dentro de <Dialog.Root>.`)
  return context
}

function Root({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  const descriptionId = useId()
  const value = useMemo(() => ({ titleId, descriptionId, onClose }), [titleId, descriptionId, onClose])

  return (
    <DialogContext value={value}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        {children}
      </div>
    </DialogContext>
  )
}

function Title({ children }: { children: ReactNode }) {
  const { titleId } = useDialogContext('Title')
  return <h2 id={titleId}>{children}</h2>
}

function Description({ children }: { children: ReactNode }) {
  const { descriptionId } = useDialogContext('Description')
  return <p id={descriptionId}>{children}</p>
}

function Close({ children }: { children: ReactNode }) {
  const { onClose } = useDialogContext('Close')
  return <button type="button" onClick={onClose}>{children}</button>
}

export const Dialog = { Root, Title, Description, Close }
```

```tsx
<Dialog.Root onClose={closeDialog}>
  <Dialog.Title>¿Archivar proyecto?</Dialog.Title>
  <Dialog.Description>Podrás restaurarlo durante 30 días.</Dialog.Description>
  <footer>
    <Dialog.Close>Cancelar</Dialog.Close>
    <Button variant="danger" onClick={archiveProject}>Archivar</Button>
  </footer>
</Dialog.Root>
```

> Un diálogo real también necesita gestionar el foco (atraparlo y devolverlo) y cerrarse con Escape. El elemento nativo `<dialog>` con `showModal()` resuelve buena parte de eso. Ver [§33](./06-buenas-practicas.md#33-accesibilidad).

#### Ejemplo 3: Cuándo una prop `items` es mejor

```tsx
// Un listado de "pasos" que SIEMPRE se ve igual y viene de datos: no hace falta un compound
type Step = { id: string; label: string; status: 'done' | 'current' | 'pending' }

function ProgressSteps({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="steps">
      {steps.map((step) => (
        <li key={step.id} aria-current={step.status === 'current' ? 'step' : undefined}>
          {step.label}
        </li>
      ))}
    </ol>
  )
}
```

💡 **Criterio:** si el consumidor **nunca** va a querer intercalar contenido, reordenar partes ni personalizar una pieza, una prop de datos es más simple (KISS).

📚 [Patterns.dev: Compound Pattern](https://www.patterns.dev/react/compound-pattern) · [Kent C. Dodds: Compound Components with Hooks](https://kentcdodds.com/blog/compound-components-with-react-hooks) · [WAI-ARIA APG: Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) · [WAI-ARIA APG: Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

---

## 11. Polymorphic Components (prop `as`)

- Un componente que cambia el elemento que renderiza según `as`, **manteniendo estilos y comportamiento**.
- Las props válidas deben **depender de `as`**.

#### Ejemplo 1: `Text` polimórfico tipado

```tsx
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type TextOwnProps<T extends ElementType> = {
  as?: T
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

// Las props nativas del elemento elegido, menos las que redefinimos
type TextProps<T extends ElementType> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>

function Text<T extends ElementType = 'span'>({ as, size = 'md', children, ...rest }: TextProps<T>) {
  const Component = as ?? 'span'
  return <Component className={`text text--${size}`} {...rest}>{children}</Component>
}
```

```tsx
<Text as="h1" size="xl">Configuración</Text>
<Text as="label" htmlFor="email" size="sm">Correo</Text> {/* ✅ htmlFor válido para label */}
<Text as="p" htmlFor="email">…</Text>                   {/* ❌ error de tipos: <p> no tiene htmlFor */}
<Text>Texto por defecto en un span</Text>
```

🧩 **Ejercicio (no incluido a propósito):** esta versión **no acepta `ref`** (usa `ComponentPropsWithoutRef`). En React 19, `ref` es una prop. ¿Cómo tiparías `ref` para que sea `Ref<HTMLAnchorElement>` cuando `as="a"` y `Ref<HTMLButtonElement>` cuando `as="button"`? Pista: investiga `ComponentPropsWithRef` y `ComponentRef`.

#### Ejemplo 2: Restringir los elementos permitidos

A veces no quieres "cualquier elemento", sino un conjunto con sentido semántico:

```tsx
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'

type HeadingProps<T extends HeadingLevel> = { as: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>

function Heading<T extends HeadingLevel>({ as, className, ...rest }: HeadingProps<T>) {
  const Component: HeadingLevel = as
  return <Component className={`heading heading--${as} ${className ?? ''}`} {...rest} />
}

// <Heading as="h2">Resumen</Heading>  ✅
// <Heading as="div">…</Heading>        ❌ no es un nivel de encabezado
```

💡 **Por qué:** la jerarquía visual (tamaño) y la semántica (nivel) son cosas distintas. Un `h3` puede verse grande, pero debe seguir siendo `h3` para los lectores de pantalla.

#### Ejemplo 3: Alternativa con `asChild` (patrón de Radix)

En vez de decirle **qué** elemento ser, el componente **se fusiona con su hijo**:

```tsx
// Consumo (conceptual): el Link del router recibe las clases y props del botón
<Button asChild>
  <RouterLink to="/settings">Ir a configuración</RouterLink>
</Button>
```

| | `as` | `asChild` |
|---|---|---|
| Tipado | Complejo (genéricos) | Más simple |
| Componentes de terceros | Requiere pasarlos como `as={RouterLink}` | Natural |
| Implementación | Directa | Requiere clonar el hijo y fusionar props (`cloneElement`) |

📚 [React TypeScript Cheatsheet: Polymorphic](https://react-typescript-cheatsheet.netlify.app/docs/advanced/patterns_by_usecase/) · [Radix: Composition (asChild)](https://www.radix-ui.com/primitives/docs/guides/composition)

---

## 12. Slots, Render Props y composición

| Necesidad | Herramienta |
|---|---|
| Contenido libre en una zona | `children` |
| Varias zonas con nombre | Slots (props `ReactNode`) |
| El padre da datos y el hijo decide el markup | Render prop o hook |
| Varias partes coordinadas | Compound Components |
| Comportamiento sin apariencia | Hook headless |

#### Ejemplo 1: Slots en un layout

```tsx
type PageLayoutProps = {
  header: ReactNode
  aside?: ReactNode
  children: ReactNode
}

function PageLayout({ header, aside, children }: PageLayoutProps) {
  return (
    <div className={aside ? 'layout layout--with-aside' : 'layout'}>
      <header className="layout__header">{header}</header>
      {aside && <aside className="layout__aside">{aside}</aside>}
      <main className="layout__main">{children}</main>
    </div>
  )
}

<PageLayout header={<Breadcrumbs path={path} />} aside={<FiltersPanel />}>
  <ResultsGrid />
</PageLayout>
```

#### Ejemplo 2: Render prop genérica para listas

```tsx
type ListProps<T> = {
  items: readonly T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  emptyState?: ReactNode
}

function List<T>({ items, getKey, renderItem, emptyState = <p>Sin elementos</p> }: ListProps<T>) {
  if (items.length === 0) return emptyState
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>
}

// TypeScript infiere T = Employee: dentro de renderItem, employee está tipado
<List
  items={employees}
  getKey={(employee) => employee.id}
  renderItem={(employee) => <EmployeeRow employee={employee} />}
  emptyState={<EmptyIllustration message="Aún no hay empleados" />}
/>
```

#### Ejemplo 3: Render prop vs. hook

```tsx
// Render prop: útil cuando el componente debe controlar DÓNDE se renderiza
<MousePosition render={({ x, y }) => <Tooltip x={x} y={y} />} />

// Hook: preferible cuando solo compartes datos o lógica
const { x, y } = useMousePosition()
return <Tooltip x={x} y={y} />
```

💡 Hoy los hooks resuelven la mayoría de los casos que antes requerían render props. Las render props siguen siendo útiles en virtualización, tablas y componentes que deciden *cuándo* o *dónde* renderizar cada ítem.

📚 [Pasar JSX como children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children) · [Patterns.dev: Render Props](https://www.patterns.dev/react/render-props-pattern)

---

## 13. Controlado / No controlado

- **No controlado:** el componente guarda su propio estado; el consumidor da el inicial (`defaultValue`).
- **Controlado:** el consumidor es dueño del estado (`value` + `onValueChange`).

**Reglas:**
- El modo se decide por la presencia de `value`.
- El callback se llama **en ambos modos**.
- No se cambia de modo durante la vida del componente.

#### Ejemplo 1: Inputs nativos

```tsx
// No controlado: el DOM guarda el valor y se lee al enviar
function SearchFormUncontrolled({ onSearch }: { onSearch: (q: string) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('query')
    if (typeof query === 'string') onSearch(query)
  }
  return <form onSubmit={handleSubmit}><input name="query" defaultValue="" /></form>
}

// Controlado: React guarda el valor y lo puede transformar en cada tecla
function UsernameInput() {
  const [username, setUsername] = useState('')
  return <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().trim())} />
}
```

#### Ejemplo 2: Un `SegmentedControl` que soporta ambos modos

```tsx
type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[]
  value?: T                  // presente → controlado
  defaultValue?: T           // inicial si NO está controlado
  onValueChange?: (value: T) => void
  label: string
}

function SegmentedControl<T extends string>({
  options, value, defaultValue, onValueChange, label,
}: SegmentedControlProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  function select(next: T) {
    if (!isControlled) setInternalValue(next) // solo actualiza su estado si es dueño
    onValueChange?.(next)                     // siempre notifica
  }

  return (
    <div role="radiogroup" aria-label={label} className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={currentValue === option.value}
          onClick={() => select(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const viewModes = [
  { value: 'grid', label: 'Cuadrícula' },
  { value: 'list', label: 'Lista' },
] as const

// No controlado: el componente recuerda la selección y avisa
<SegmentedControl label="Vista" options={viewModes} defaultValue="grid" onValueChange={trackViewMode} />

// Controlado: el padre es dueño (por ejemplo, para sincronizarlo con la URL)
<SegmentedControl label="Vista" options={viewModes} value={viewMode} onValueChange={setViewMode} />
```

💡 Gracias al genérico `T`, `onValueChange` recibe `'grid' | 'list'` y no `string`.

🧩 **Ejercicio:** esta lógica (estado interno + "¿estoy controlado?" + notificar) se repetirá en cada componente reutilizable. Extráela a un hook genérico `useControllableState<T>`. ¿Qué parámetros recibe? ¿Qué devuelve? ¿Cómo detectas (y avisas en desarrollo) que alguien cambió de modo?

#### Ejemplo 3: El bug de cambiar de modo

```tsx
// ❌ Al inicio user es undefined, así que user?.name es undefined (no controlado).
//    Cuando llega el usuario, pasa a ser string (controlado).
//    React avisa: "A component is changing an uncontrolled input to be controlled".
<input value={user?.name} onChange={handleChange} />

// ✅ Siempre controlado
<input value={user?.name ?? ''} onChange={handleChange} />
```

📚 [Componentes controlados y no controlados](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components) · [Radix: use-controllable-state (código para estudiar)](https://github.com/radix-ui/primitives/tree/main/packages/react/use-controllable-state)

---

## 14. Higher-Order Components (legado)

Un HOC es una función que recibe un componente y devuelve otro "decorado" (patrón Decorator).

#### Ejemplo 1: HOC vs. hook

```tsx
// ❌ HOC: ¿de dónde sale la prop `user`? No se ve en el componente
function withUser<P extends { user: User }>(Wrapped: ComponentType<P>) {
  return function WithUser(props: Omit<P, 'user'>) {
    const user = useCurrentUser()
    if (!user) return <LoginPrompt />
    return <Wrapped {...(props as P)} user={user} /> // ← además obliga a una aserción
  }
}
const ProfileWithUser = withUser(Profile)

// ✅ Hook: la dependencia es explícita y no hay que tipar nada raro
function Profile() {
  const user = useCurrentUser()
  if (!user) return <LoginPrompt />
  return <h1>{user.name}</h1>
}
```

#### Ejemplo 2: Cuando un componente "guardián" es mejor que un HOC

```tsx
function RequirePermission({ permission, children, fallback = null }: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const allowed = usePermission(permission)
  return allowed ? children : fallback
}

<RequirePermission permission="billing:read" fallback={<UpgradeBanner />}>
  <BillingDashboard />
</RequirePermission>
```

💡 **Reconoce los HOC** en código legado (`connect` de Redux, `withRouter`), pero en código nuevo prefiere **hooks** o **componentes de composición**.

📚 [Patterns.dev: HOC Pattern](https://www.patterns.dev/react/hoc-pattern)

---

[← Parte II: Fundamentos](./02-fundamentos-react.md) · [Índice](../ESTUDIO.md) · [Parte IV: Patrones de diseño →](./04-patrones-diseno.md)
