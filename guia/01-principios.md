# Parte I · Principios

[← Índice](../ESTUDIO.md) · [Parte II: Fundamentos →](./02-fundamentos-react.md)

> Para no repetir ruido, en los ejemplos se omiten los imports de React (`useState`, `useEffect`, `ReactNode`…). Cuando un import es importante para la idea, aparece.
> Formato: **❌ Antes** muestra el problema, **✅ Después** la mejora y **💡 Por qué** la razón.

---

## 1. SOLID en React

SOLID nació en la programación orientada a objetos, pero sus ideas se traducen directamente a componentes, hooks y módulos:

| Principio | Pregunta que te hace | Herramienta típica en React |
|---|---|---|
| **S**RP | ¿Cuántas razones tiene esto para cambiar? | Separar hook (lógica), función pura (transformación) y componente (vista) |
| **O**CP | ¿Puedo agregar un caso sin editar lo que funciona? | Composición, mapas de configuración, estrategias |
| **L**SP | ¿Puedo usar esto donde se espera el original sin sorpresas? | Respetar contratos nativos y de interfaces |
| **I**SP | ¿Depende de cosas que no usa? | Props mínimas, contextos e interfaces pequeños |
| **D**IP | ¿Depende de detalles concretos (fetch, storage)? | Contratos + inyección (props, parámetros, contexto) |

---

### 1.1 SRP: Single Responsibility (Responsabilidad Única)

> *Un módulo debe tener una sola razón para cambiar.*

En React, las razones de cambio típicas son **cómo se ve**, **de dónde vienen los datos**, **cómo se transforman** y **qué reglas de negocio aplican**.

#### Ejemplo 1: Perfil que pide datos, los transforma y los pinta

❌ **Antes**

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDto | null>(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((response) => response.json())
      .then(setUser)
  }, [userId])

  if (!user) return <p>Cargando…</p>

  const fullName = `${user.first_name} ${user.last_name}`.trim()
  const memberSince = new Date(user.created_at).toLocaleDateString('es')

  return (
    <section>
      <h2>{fullName}</h2>
      <p>Miembro desde {memberSince}</p>
    </section>
  )
}
```

✅ **Después**: tres piezas, cada una con un solo motivo de cambio.

```ts
// user-formatters.ts: transformación pura (cambia si cambia el formato)
export function formatFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function formatMemberSince(date: Date): string {
  return date.toLocaleDateString('es')
}
```

```tsx
// user-profile-view.tsx: solo presentación (cambia si cambia el diseño)
type UserProfileViewProps = { fullName: string; memberSince: string }

function UserProfileView({ fullName, memberSince }: UserProfileViewProps) {
  return (
    <section>
      <h2>{fullName}</h2>
      <p>Miembro desde {memberSince}</p>
    </section>
  )
}
```

```tsx
// user-profile.tsx: orquestación (cambia si cambia de dónde salen los datos)
function UserProfile({ userId }: { userId: string }) {
  const userState = useUser(userId) // hook que encapsula la obtención de datos

  if (userState.status !== 'success') return <p>Cargando…</p>

  return (
    <UserProfileView
      fullName={formatFullName(userState.user)}
      memberSince={formatMemberSince(userState.user.memberSince)}
    />
  )
}
```

💡 **Por qué:** ahora puedes testear `formatFullName` sin React, previsualizar `UserProfileView` sin red, y cambiar la API tocando solo `useUser`.

#### Ejemplo 2: Formulario de registro con todo adentro

❌ **Antes**: un componente valida, envía, muestra errores y redirige.

```tsx
function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.includes('@')) return setError('Correo inválido')
    if (password.length < 8) return setError('Mínimo 8 caracteres')
    const response = await fetch('/api/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (!response.ok) return setError('No se pudo registrar')
    window.location.href = '/welcome'
  }

  return <form onSubmit={handleSubmit}>{/* inputs + error */}</form>
}
```

✅ **Después**

```ts
// signup-validation.ts: reglas puras
type SignupInput = { email: string; password: string }
type SignupErrors = Partial<Record<keyof SignupInput, string>>

export function validateSignup(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {}
  if (!input.email.includes('@')) errors.email = 'Correo inválido'
  if (input.password.length < 8) errors.password = 'Mínimo 8 caracteres'
  return errors
}
```

```ts
// use-signup.ts: caso de uso (enviar y reportar el resultado)
export function useSignup(onSuccess: () => void) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'failed'>('idle')

  async function signup(input: SignupInput) {
    setStatus('submitting')
    const ok = await authService.signup(input) // dependencia inyectable (ver DIP)
    if (ok) onSuccess()
    else setStatus('failed')
  }

  return { status, signup }
}
```

```tsx
// signup-form.tsx: solo UI y estado del formulario
function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState<SignupInput>({ email: '', password: '' })
  const errors = validateSignup(values) // derivado, no estado
  const { status, signup } = useSignup(onSuccess)
  const canSubmit = Object.keys(errors).length === 0 && status !== 'submitting'
  // …
}
```

💡 **Por qué:** la validación se reutiliza (por ejemplo, en el servidor o en otro formulario), la redirección la decide quien usa el formulario y el componente solo coordina.

#### Ejemplo 3: El archivo `utils.ts` "cajón de sastre"

❌ **Antes**

```
src/utils.ts   → formatDate, formatCurrency, fetchWithAuth, slugify, calculateTax, debounce …
```

✅ **Después**

```
src/shared/lib/format-date.ts
src/shared/lib/format-currency.ts
src/shared/lib/slugify.ts
src/shared/hooks/use-debounced-value.ts
src/features/billing/domain/calculate-tax.ts      ← regla de negocio: vive en su feature
src/features/auth/infrastructure/http-client.ts   ← I/O: vive en infraestructura
```

💡 **Por qué:** un archivo con diez razones para cambiar provoca conflictos de merge, imports que arrastran código innecesario y responsabilidades que nadie posee.

**Señales de violación de SRP:**
- Archivos de más de 200 líneas.
- Nombres con "And" o "Manager".
- Tests que mockean red para verificar un estilo.

---

### 1.2 OCP: Open/Closed (Abierto/Cerrado)

> *Abierto a extensión, cerrado a modificación.*

#### Ejemplo 1: Tonos de alerta con `if` vs. mapa de configuración

❌ **Antes**

```tsx
function Alert({ tone, children }: { tone: string; children: ReactNode }) {
  if (tone === 'info') return <div className="alert alert--info">{children}</div>
  if (tone === 'error') return <div className="alert alert--error">{children}</div>
  return <div className="alert">{children}</div> // tono nuevo → nuevo if
}
```

✅ **Después**

```tsx
const alertTones = {
  info: 'alert--info',
  success: 'alert--success',
  warning: 'alert--warning',
  error: 'alert--error',
} as const

type AlertTone = keyof typeof alertTones

function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return <div role="alert" className={`alert ${alertTones[tone]}`}>{children}</div>
}
```

💡 **Por qué:** agregar un tono es agregar una línea de datos, y el tipo `AlertTone` se actualiza solo.

#### Ejemplo 2: Registro de renderizadores por tipo de notificación

❌ **Antes**: un `switch` que crece en cada sprint.

```tsx
function NotificationItem({ notification }: { notification: AppNotification }) {
  switch (notification.kind) {
    case 'mention': return <p>{notification.author} te mencionó</p>
    case 'follow': return <p>{notification.follower} te sigue</p>
    // nuevo tipo → editar este componente
  }
}
```

✅ **Después**: un registro tipado. TypeScript **obliga** a registrar cada tipo.

```tsx
type AppNotification =
  | { kind: 'mention'; id: string; author: string; excerpt: string }
  | { kind: 'follow'; id: string; follower: string }
  | { kind: 'payment'; id: string; amount: number }

type RendererMap = {
  [K in AppNotification['kind']]: (notification: Extract<AppNotification, { kind: K }>) => ReactNode
}

const notificationRenderers: RendererMap = {
  mention: (n) => <p><strong>{n.author}</strong> te mencionó: “{n.excerpt}”</p>,
  follow: (n) => <p><strong>{n.follower}</strong> empezó a seguirte</p>,
  payment: (n) => <p>Recibiste un pago de {n.amount}</p>,
}

function renderNotification<K extends AppNotification['kind']>(
  notification: Extract<AppNotification, { kind: K }>,
): ReactNode {
  const render = notificationRenderers[notification.kind] as RendererMap[K]
  return render(notification)
}
```

> La única aserción (`as RendererMap[K]`) está **encapsulada en un punto**, y es una limitación conocida de TypeScript con mapas correlacionados. Si prefieres cero aserciones, el `switch` con exhaustividad `never` (ver [§30](./06-buenas-practicas.md#30-typescript-aplicado-a-react)) también es válido. OCP no exige mapas, exige que extender sea barato y seguro.

💡 **Por qué:** agregar `'comment'` a la unión hace que TypeScript marque error hasta que registres su renderizador. La extensión es guiada por el compilador.

#### Ejemplo 3: Modal configurable vs. modal componible

❌ **Antes**: cada pantalla nueva pide una prop nueva.

```tsx
<Modal
  title="Eliminar cuenta"
  showCancel
  cancelText="Volver"
  confirmText="Eliminar"
  confirmVariant="danger"
  showIcon
  iconName="warning"
/>
```

✅ **Después**: el modal ofrece estructura y el contenido lo decide el consumidor.

```tsx
<Modal title="Eliminar cuenta" footer={
  <>
    <Button variant="ghost" onClick={close}>Volver</Button>
    <Button variant="danger" onClick={deleteAccount}>Eliminar</Button>
  </>
}>
  <WarningIcon /> Esta acción no se puede deshacer.
</Modal>
```

💡 **Por qué:** `Modal` queda **cerrado** (no se edita) y **abierto** (se extiende con cualquier contenido).

---

### 1.3 LSP: Liskov Substitution (Sustitución de Liskov)

> *Si algo dice ser un X, debe poder usarse donde se espera un X sin sorpresas.*

#### Ejemplo 1: `TextField` que cambia la firma de `onChange`

❌ **Antes**

```tsx
type TextFieldProps = { label: string; value: string; onChange: (value: string) => void }

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
// Quien espera el evento nativo (event.target.name, librerías de formularios) se rompe.
// Además, no se pueden pasar placeholder, type, required, aria-*…
```

✅ **Después**: respeta el contrato nativo y extiende.

```tsx
type TextFieldProps = ComponentProps<'input'> & { label: string; hint?: string }

function TextField({ label, hint, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-describedby={hint ? hintId : undefined} {...inputProps} />
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
```

Si de verdad quieres una API basada en valor, **cambia el nombre**: `onValueChange(value: string)`.

#### Ejemplo 2: `IconButton` que ignora props nativas

❌ **Antes**

```tsx
function IconButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick}>{icon}<span className="sr-only">{label}</span></button>
}
// <IconButton disabled />   → no compila
// Dentro de un <form>, este botón ENVÍA el formulario (el type por defecto es "submit")
```

✅ **Después**

```tsx
type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & { icon: ReactNode; label: string }

function IconButton({ icon, label, type = 'button', ...buttonProps }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} {...buttonProps}>
      {icon}
    </button>
  )
}
```

💡 **Por qué:** un "botón" debe comportarse como un botón: `disabled`, `type`, `form`, `aria-*` y `ref` (en React 19, `ref` viaja dentro de `buttonProps`).

#### Ejemplo 3: Implementaciones de un contrato que no son intercambiables

```ts
interface KeyValueStore {
  /** Devuelve null si la clave no existe. */
  get(key: string): string | null
  set(key: string, value: string): void
}
```

❌ **Antes**: una implementación rompe la promesa.

```ts
const memoryStore: KeyValueStore = {
  get(key) {
    const value = memory.get(key)
    if (value === undefined) throw new Error(`Missing key ${key}`) // ❌ el contrato dice null
    return value
  },
  set(key, value) { memory.set(key, value) },
}
```

✅ **Después**

```ts
const memory = new Map<string, string>()

const memoryStore: KeyValueStore = {
  get: (key) => memory.get(key) ?? null,
  set: (key, value) => { memory.set(key, value) },
}

const browserStore: KeyValueStore = {
  get: (key) => window.localStorage.getItem(key),
  set: (key, value) => window.localStorage.setItem(key, value),
}
```

💡 **Por qué:** quien use `KeyValueStore` no debería saber *cuál* recibió. Si una implementación lanza donde otra devuelve `null`, ya no son sustituibles. LSP es lo que hace funcionar a DIP.

---

### 1.4 ISP: Interface Segregation (Segregación de Interfaces)

> *Ningún cliente debe depender de lo que no usa.*

#### Ejemplo 1: Props mínimas

❌ **Antes**

```tsx
function UserAvatar({ user }: { user: User }) { // User tiene 20 campos
  return <img src={user.avatarUrl} alt={user.displayName} />
}
```

✅ **Después**

```tsx
type AvatarProps = { imageUrl: string; name: string; size?: 'sm' | 'md' | 'lg' }

function Avatar({ imageUrl, name, size = 'md' }: AvatarProps) {
  return <img className={`avatar avatar--${size}`} src={imageUrl} alt={name} />
}

// Sirve para usuarios, equipos, empresas…
<Avatar imageUrl={user.avatarUrl} name={user.displayName} />
<Avatar imageUrl={team.logoUrl} name={team.name} size="lg" />
```

#### Ejemplo 2: Contexto "gordo" dividido por responsabilidad

❌ **Antes**: todo componente que solo pregunta "¿puedo editar?" se re-renderiza cuando cambia cualquier cosa del usuario.

```ts
type AuthContextValue = {
  user: User | null
  token: string | null
  permissions: readonly Permission[]
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateProfile: (changes: Partial<User>) => Promise<void>
}
```

✅ **Después**: hooks pequeños para necesidades distintas.

```ts
// Quien solo muestra el nombre
function useCurrentUser(): User | null { /* … */ }

// Quien solo decide si mostrar un botón
function usePermission(permission: Permission): boolean { /* … */ }

// Quien inicia o cierra sesión
function useAuthActions(): { login: (c: Credentials) => Promise<void>; logout: () => void } { /* … */ }
```

💡 **Por qué:** cada consumidor depende del mínimo, y puedes separar los contextos internamente sin cambiar a los consumidores.

#### Ejemplo 3: Interfaz de servicio enorme vs. roles

❌ **Antes**

```ts
interface UserService {
  search(query: string): Promise<User[]>
  getById(id: string): Promise<User>
  create(input: NewUser): Promise<User>
  update(id: string, changes: Partial<User>): Promise<User>
  delete(id: string): Promise<void>
  exportCsv(): Promise<Blob>
  // … 8 métodos más
}

// Un buscador recibe UserService y, para testearlo, hay que implementar 14 métodos.
```

✅ **Después**: interfaces por rol (TypeScript permite que un objeto cumpla varias).

```ts
interface UserSearcher { search(query: string): Promise<User[]> }
interface UserReader { getById(id: string): Promise<User> }
interface UserWriter {
  create(input: NewUser): Promise<User>
  update(id: string, changes: Partial<User>): Promise<User>
}

function useUserSearch(searcher: UserSearcher) { /* … */ }

// Test: un objeto con un solo método basta
const fakeSearcher: UserSearcher = { search: async () => [] }
```

---

### 1.5 DIP: Dependency Inversion (Inversión de Dependencias)

> *Lo de alto nivel (UI, reglas) no depende de lo de bajo nivel (fetch, storage, SDKs). Ambos dependen de abstracciones.*

#### Ejemplo 1: Analytics inyectado por props

❌ **Antes**

```tsx
import mixpanel from 'mixpanel-browser'

function NewsletterForm() {
  function handleSubscribe() {
    mixpanel.track('newsletter_subscribed') // ❌ acoplado a un proveedor concreto
  }
  // …
}
```

✅ **Después**

```ts
// domain/analytics-tracker.ts: el contrato
export interface AnalyticsTracker {
  track(eventName: string, properties?: Record<string, string | number>): void
}
```

```ts
// infrastructure/console-analytics-tracker.ts: un adaptador
import type { AnalyticsTracker } from '../domain/analytics-tracker'

export const consoleAnalyticsTracker: AnalyticsTracker = {
  track: (eventName, properties) => console.info('[analytics]', eventName, properties),
}
```

```tsx
// components/newsletter-form.tsx: depende solo del contrato
import type { AnalyticsTracker } from '../domain/analytics-tracker'

function NewsletterForm({ tracker }: { tracker: AnalyticsTracker }) {
  function handleSubscribe() {
    tracker.track('newsletter_subscribed', { source: 'footer' })
  }
  // …
}
```

#### Ejemplo 2: El reloj como dependencia

❌ **Antes**: imposible de testear sin manipular el reloj global.

```tsx
function GreetingBanner({ name }: { name: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  return <p>{greeting}, {name}</p>
}
```

✅ **Después**: la regla es pura y el "ahora" se inyecta.

```ts
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
```

```tsx
function GreetingBanner({ name, now = new Date() }: { name: string; now?: Date }) {
  return <p>{greetingFor(now.getHours())}, {name}</p>
}

// Test: <GreetingBanner name="Ana" now={new Date('2026-01-01T08:00:00')} />
```

💡 **Por qué:** `new Date()`, `Math.random()` y `crypto.randomUUID()` también son dependencias de bajo nivel. Inyectarlas hace tu lógica determinista.

#### Ejemplo 3: Feature flags inyectados por contexto

❌ **Antes**: variables de entorno leídas en 30 componentes.

```tsx
function Sidebar() {
  return import.meta.env.VITE_ENABLE_REPORTS === 'true' ? <ReportsLink /> : null
}
```

✅ **Después**

```ts
// domain/feature-flags.ts
export type FeatureName = 'reports' | 'darkMode' | 'betaEditor'

export interface FeatureFlags {
  isEnabled(feature: FeatureName): boolean
}
```

```tsx
// feature-flags-context.ts (sin JSX, para no romper Fast Refresh)
export const FeatureFlagsContext = createContext<FeatureFlags | null>(null)
```

```tsx
// feature-flags-provider.tsx
export function FeatureFlagsProvider({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  return <FeatureFlagsContext value={flags}>{children}</FeatureFlagsContext> // React 19
}
```

```ts
// use-feature.ts
export function useFeature(feature: FeatureName): boolean {
  const flags = useContext(FeatureFlagsContext)
  if (!flags) throw new Error('useFeature debe usarse dentro de <FeatureFlagsProvider>')
  return flags.isEnabled(feature)
}
```

```tsx
// app/App.tsx: Composition Root, el ÚNICO lugar que conoce la implementación
const envFlags: FeatureFlags = {
  isEnabled: (feature) => import.meta.env[`VITE_FLAG_${feature.toUpperCase()}`] === 'true',
}

<FeatureFlagsProvider flags={envFlags}>
  <Layout />
</FeatureFlagsProvider>
```

💡 **Por qué:** mañana los flags pueden venir de LaunchDarkly o de un endpoint, y solo cambias `envFlags`. En tests y Storybook pasas `{ isEnabled: () => true }`.

**Señales de violación de DIP:**
- `fetch(`, `localStorage.` o SDKs importados en componentes.
- `components/` importa de `infrastructure/`.
- Tests que necesitan `vi.mock('modulo')`.

🏋️ **Practica:** busca en tu código un `fetch` o un `localStorage` dentro de un componente. Escribe (sin implementar) la interfaz que lo reemplazaría, con nombres de dominio y no de HTTP.

📚 [Konstantin Lebedev: Applying SOLID principles in React](https://konstantinlebedev.com/solid-in-react/) · [Refactoring.Guru: SOLID](https://refactoring.guru/es/design-patterns/book)

---

## 2. Principios complementarios

| Principio | Idea | En React |
|---|---|---|
| **DRY** | Una fuente de verdad por *conocimiento* | Las reglas de negocio en un solo lugar |
| **AHA** / Regla de tres | Abstrae a la tercera repetición | Mejor duplicar que crear una abstracción equivocada |
| **KISS** | La solución más simple que funcione | No uses Context para lo que resuelve un `useState` |
| **YAGNI** | No construyas lo no pedido | Nada de props "por si acaso" |
| **Composición > herencia** | Combinar piezas | `children`, hooks, slots |
| **Separation of Concerns** | Separar datos, lógica y vista | Hooks / funciones puras / componentes |
| **Ley de Demeter** | Habla con tus vecinos inmediatos | Pide `city`, no `order.customer.address.city` |
| **Estados imposibles** | El tipo no permite estados inválidos | Uniones discriminadas |
| **Colocation** | Código cerca de su uso | El estado en el componente más bajo posible |
| **Fail fast** | Fallar pronto y con claridad | Guards con mensajes descriptivos |
| **Least Astonishment** | La API hace lo que su nombre promete | `onChange` se comporta como el nativo |

### 2.1 DRY vs. AHA

#### Ejemplo 1: DRY bien aplicado (conocimiento duplicado)

❌ **Antes**: la regla "un post tiene máximo 280 caracteres" aparece en tres componentes.

```tsx
// post-composer.tsx
const isTooLong = text.length > 280
// post-counter.tsx
<span>{280 - text.length}</span>
// post-preview.tsx
{text.length > 280 && <p>El post es demasiado largo</p>}
```

✅ **Después**

```ts
// features/posts/domain/post-length.ts
export const MAX_POST_LENGTH = 280

export function remainingCharacters(text: string): number {
  return MAX_POST_LENGTH - text.length
}

export function isPostTooLong(text: string): boolean {
  return remainingCharacters(text) < 0
}
```

💡 **Por qué:** cuando el producto cambie el límite a 500, cambias una constante y no tres componentes (de los cuales siempre se olvida uno).

#### Ejemplo 2: AHA (abstracción prematura)

❌ **Antes**: dos tarjetas "parecidas" se fusionaron, y ahora el componente está lleno de flags.

```tsx
<GenericCard
  isProduct
  showPrice
  showRating={false}
  showAuthor
  authorPosition="bottom"
  compact={isMobile}
  hideImageOnError
/>
```

✅ **Después**: componentes de dominio separados que **comparten piezas pequeñas**.

```tsx
function ProductCard({ product }: { product: Product }) {
  return (
    <Card>
      <Card.Image src={product.imageUrl} alt={product.name} />
      <h3>{product.name}</h3>
      <Price amount={product.price} />
    </Card>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Card>
      <h3>{article.title}</h3>
      <AuthorLine author={article.author} />
    </Card>
  )
}
```

💡 **Regla práctica:** duplicar **JSX parecido** está bien, pero duplicar **reglas de negocio**, no. Antes de abstraer, pregúntate: "si cambia uno, ¿siempre debe cambiar el otro?".

### 2.2 KISS y YAGNI

#### Ejemplo 1: Context innecesario

❌ **Antes**

```tsx
// Un contexto global para un modal que solo usa una página
const ConfirmDeleteModalContext = createContext(/* … */)
```

✅ **Después**

```tsx
function ProjectSettingsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  // …
}
```

#### Ejemplo 2: Props "por si acaso"

❌ **Antes**

```tsx
type DataTableProps<T> = {
  rows: T[]
  sortable?: boolean
  filterable?: boolean
  exportable?: boolean
  virtualized?: boolean
  draggableRows?: boolean
  // Nadie pidió nada de esto todavía
}
```

✅ **Después**: implementa lo que la pantalla necesita hoy y deja la API abierta a composición para mañana.

### 2.3 Haz imposibles los estados imposibles

#### Ejemplo 1: Subida de archivo

```ts
// ❌ 8 combinaciones posibles, y solo 4 son válidas
type UploadState = { isUploading: boolean; isDone: boolean; error: string | null; progress: number }

// ✅ Solo existen estados válidos, y cada uno trae únicamente sus datos
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'done'; fileUrl: string }
  | { status: 'failed'; reason: string }
```

#### Ejemplo 2: El render se vuelve exhaustivo

```tsx
function UploadStatus({ state }: { state: UploadState }) {
  switch (state.status) {
    case 'idle': return <p>Selecciona un archivo</p>
    case 'uploading': return <progress value={state.progress} max={100} />
    case 'done': return <a href={state.fileUrl}>Ver archivo</a>
    case 'failed': return <p role="alert">{state.reason}</p>
  }
}
// En la rama 'done', state.progress NO existe, y TypeScript lo impide.
```

#### Ejemplo 3: Props mutuamente excluyentes

```ts
// ❌ Se puede pasar href y onClick a la vez, o ninguno
type ActionProps = { href?: string; onClick?: () => void }

// ✅ Exactamente uno de los dos
type ActionProps =
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
```

### 2.4 Ley de Demeter

❌ **Antes**

```tsx
function ShippingLabel({ order }: { order: Order }) {
  return <p>{order.customer.address.city}, {order.customer.address.country.name}</p>
}
```

✅ **Después**

```tsx
function ShippingLabel({ city, country }: { city: string; country: string }) {
  return <p>{city}, {country}</p>
}

// El conocimiento de la estructura de Order queda en un solo lugar (el contenedor)
<ShippingLabel city={order.customer.address.city} country={order.customer.address.country.name} />
```

### 2.5 Colocation

#### Ejemplo 1: Estado demasiado arriba

❌ **Antes**: `App` guarda si el tooltip de una tarjeta está abierto, y toda la app se re-renderiza al hacer hover.

```tsx
function App() {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  // …se pasa por 4 niveles
}
```

✅ **Después**: el estado vive en la tarjeta.

```tsx
function ProductCard({ product }: { product: Product }) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  // …
}
```

#### Ejemplo 2: Archivos de una feature dispersos

❌ `components/InvoiceTable.tsx`, `hooks/useInvoices.ts`, `types/invoice.ts`, `styles/invoice.css`

✅ Todo en `features/invoices/`. Ver [§24](./05-arquitectura.md#24-feature-first).

### 2.6 Fail fast

```ts
// ❌ Falla en silencio: el error aparece 3 componentes después como "cannot read x of undefined"
export function useTheme() {
  return useContext(ThemeContext)
}

// ✅ Falla en el punto exacto, con un mensaje accionable
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>.')
  return context
}
```

🏋️ **Practica:** toma cualquier componente con dos o más booleanos de estado y modela sus estados como unión discriminada. ¿Cuántas combinaciones inválidas eliminaste?

📚 [Kent C. Dodds: AHA Programming](https://kentcdodds.com/blog/aha-programming) · [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation) · [Richard Feldman: Making Impossible States Impossible](https://www.youtube.com/watch?v=IcgmSRJHu_8)

---

[← Índice](../ESTUDIO.md) · [Parte II: Fundamentos →](./02-fundamentos-react.md)
