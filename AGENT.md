# AGENT.md — ChatEdu Builder

Instrucciones para agentes de IA (Claude Code, Copilot, Cursor, etc.) que trabajen sobre este repositorio.

---

## Identidad del proyecto

ChatEdu Builder es una SPA React + Vite. Su propósito es permitir a docentes sin perfil técnico crear chatbots educativos usando sus propios materiales curriculares. El motor de inferencia es `gemini-2.5-flash` vía API REST de Google (Gemini Developer API). Los bots se persisten en Azure Cosmos DB y los documentos en Azure Blob Storage.

---

## Reglas absolutas de arquitectura

Estas reglas no deben violarse bajo ningún pretexto. Cualquier PR que las incumpla debe ser rechazado.

### 1. Separación estricta de responsabilidades

| Capa | Carpeta | Qué contiene | Qué NO debe contener |
|---|---|---|---|
| Estilos globales | `src/styles/` | Tokens CSS, resets, clases de utilidad | Lógica JS, imports de componentes |
| Estilos locales | `*.module.css` junto al componente | Estilos scoped del componente | Estilos de otros componentes |
| Constantes | `src/constants/index.js` | Valores estáticos, configuración | Funciones, hooks, JSX |
| Datos mock | `src/data/mockData.js` | Estructuras de datos de demo | Lógica de negocio, fetch |
| Servicios | `src/services/` | Llamadas a APIs externas y Azure | Estado React, JSX |
| Hooks | `src/hooks/` | Estado y efectos reutilizables | JSX, estilos inline |
| Componentes | `src/components/` | Presentación + interacción del usuario | Llamadas `fetch()` directas |
| Páginas | `src/pages/` | Vistas de nivel de ruta (Login, etc.) | Lógica de negocio compleja |
| Auth | `src/auth/` | Contexto y lógica de autenticación | JSX de presentación |
| App raíz | `src/App.jsx` | Enrutamiento de vistas + guard de auth | Lógica de negocio, estilos |

### 2. Estilos

- **Prohibido** el uso de `style={{}}` inline en JSX salvo para valores dinámicos que no pueden expresarse como clases CSS (por ejemplo, `height: ${value}px` en barras de gráfico).
- **Prohibido** importar `globals.css` desde componentes individuales. Solo se importa en `main.jsx`.
- **Obligatorio** usar CSS Modules (`.module.css`) para estilos de componente.
- Las variables de diseño viven en `globals.css` como custom properties CSS y deben usarse con `var(--nombre)`.
- Prohibido hardcodear valores de color o espaciado. Usar siempre las custom properties.

### 3. Llamadas a APIs y servicios Azure

- **Ningún componente puede llamar a `fetch()` directamente.** Toda comunicación con APIs externas pasa por `src/services/`.
- La función `sendChatMessage` en `src/services/geminiApi.js` es el único punto de acceso a la API de Gemini.
- Las funciones en `src/services/db.js` son el único punto de acceso a Azure Cosmos DB (bots y usuarios).
- Las funciones en `src/services/storage.js` son el único punto de acceso a Azure Blob Storage.
- Las API keys y credenciales se leen **únicamente** desde `import.meta.env.*`. No deben pasarse como props ni almacenarse en estado.

### 4. Estado

- No añadir librerías de estado externas sin justificación técnica documentada.
- El estado local usa `useState`. El estado compartido entre vistas usa hooks personalizados en `src/hooks/`.
- La inicialización de servicios externos (DB, Storage) debe hacerse con `useRef` para garantizar que el flag de inicialización esté ligado al ciclo de vida del componente.

### 5. Componentes

- Los componentes son funcionales con hooks. No se usan class components.
- Un componente no debe superar 150 líneas. Si lo hace, se divide.
- Los componentes de vista no contienen lógica de negocio.
- **Los hooks de React deben llamarse en el nivel superior del componente, antes de cualquier retorno condicional** (Regla de Hooks de React).

### 6. Seguridad

- Las variables `VITE_*` son visibles en el bundle del cliente. Nunca poner en ellas secretos que no deban ser accesibles por el usuario final en producción.
- En producción, la lógica de Cosmos DB, Blob Storage y la API de IA deben ejecutarse en Azure Functions con Managed Identity, no en el cliente.
- Los contenedores de Azure Blob Storage deben crearse siempre sin `publicAccessLevel` (privados por defecto).

### 7. Roles y usuarios (v0.2.0)

- **La creación de cuentas con rol `docente` o `profesor` está bloqueada en el flujo de auto-registro.**
  Solo un administrador puede crear cuentas de docente directamente en Azure Cosmos DB (contenedor `users`).
- La constante `ROLE_RESTRICTION_MSG` en `src/auth/AuthContext.jsx` es el único texto canónico del aviso.
  El frontend (`Login.jsx`) lo importa y muestra; no debe redactarse en ningún otro lugar.
- Si se añaden nuevos roles restringidos, agregarlos al `Set` `RESTRICTED_ROLES` en `AuthContext.jsx`.
- `login()` en `AuthContext` es **async**; los componentes que lo llamen deben usar `await` dentro de un `onSubmit` o `onClick` async.

### 8. Persistencia de bots (v0.2.0)

- Cada documento bot en Cosmos DB **debe incluir el campo `userId`** (email del propietario).
  Sin este campo el bot quedará huérfano y no aparecerá en el dashboard del usuario.
- El campo `files` en un bot contiene únicamente **metadatos serializables**:
  `{ id: number, name: string, size: string, status: string }`.
  Nunca guardar objetos `File` del navegador en el documento de Cosmos DB.
- `getBotsByUser(userId)` en `db.js` realiza una consulta cross-partition. Para producción a escala,
  recrear el contenedor `bots` con `partitionKey: '/userId'` para mejorar el rendimiento.

### 9. Guard de autenticación y carga inicial (v0.3.0)

- `AuthProvider` expone `isAuthLoading` (boolean). Es `true` mientras se hidrata la sesión desde
  `localStorage` en el primer montaje del provider.
- `AppInner` en `App.jsx` **debe** verificar `isAuthLoading` antes de renderizar `Login` o
  `AppAuthenticated`. Mientras sea `true`, devuelve `null`.
- **No eliminar ni bypassear este flag.** Sin él, la app salta el Login en visitas recurrentes porque
  `localStorage` ya tiene sesión guardada, y el primer render ve `isAuthenticated=false` (estado
  inicial), renderiza Login, y un tick después lo reemplaza por Dashboard sin que el usuario
  haya ingresado credenciales en esa sesión.
- Si se migra a Entra ID, este flag debe seguir existiendo o ser reemplazado por el equivalente
  de MSAL (`inProgress !== InteractionStatus.None`).

### 10. Usuario de prueba admin/admin (v0.3.0)

- Las constantes `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` en `AuthContext.jsx` definen las
  credenciales de testeo: email `admin`, contraseña `admin`.
- Este usuario **no requiere Cosmos DB ni variables de entorno**. Su sesión es solo local.
- `Login.jsx` pasa el campo `password` a `login()`. La validación ocurre en `AuthContext.login()`.
- **Antes de pasar a producción real:** eliminar o deshabilitar el bloque `TEST_ADMIN` en
  `AuthContext.jsx`, o protegerlo con una variable de entorno `VITE_ENABLE_TEST_ADMIN=false`.

---

## Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `BotConfigForm.jsx` |
| CSS Modules | PascalCase + `.module.css` | `BotConfigForm.module.css` |
| Hooks | camelCase con prefijo `use` | `useChat.js` |
| Servicios | camelCase + descriptor | `geminiApi.js`, `db.js`, `storage.js` |
| Constantes | SCREAMING_SNAKE_CASE | `GEMINI_MODEL`, `BUILDER_STEPS` |
| Clases CSS Modules | camelCase | `.chatWindow`, `.stepWrapper` |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Sí | API key de Google Gemini. Gratuita en https://aistudio.google.com/apikey |
| `VITE_COSMOS_ENDPOINT` | No* | Endpoint de Azure Cosmos DB. Sin esta variable, la app usa datos locales. |
| `VITE_COSMOS_KEY` | No* | Clave primaria de Azure Cosmos DB. |
| `VITE_STORAGE_CONNECTION_STRING` | No* | Connection string de Azure Blob Storage. |

*Opcionales en desarrollo local. La app cae automáticamente a datos mock si no están definidas.

**En producción:** registrar como Secrets en GitHub Actions. En el servidor (Azure Functions), usar Managed Identity en lugar de claves.

---

## Modelo de IA

El modelo activo es `gemini-2.5-flash` (free tier de Google AI Studio, sin tarjeta de crédito).
La constante `GEMINI_MODEL` en `src/constants/index.js` es la única fuente de verdad.

Free tier actual:
- 10 requests por minuto
- 250 requests por día

Si se actualiza el modelo:
1. Cambiar `GEMINI_MODEL` en `constants/index.js`.
2. Verificar compatibilidad de parámetros en `geminiApi.js`.
3. Actualizar este archivo y `README.md`.

---

## Servicios Azure

| Servicio | Archivo | Descripción |
|---|---|---|
| Azure Cosmos DB | `src/services/db.js` | Persiste los **bots** (contenedor `bots`) y los **usuarios** (contenedor `users`). Base de datos: `chatedu`. |
| Azure Blob Storage | `src/services/storage.js` | Almacena los documentos subidos por el docente. Contenedor: `documents` (privado). |

Ambos servicios son **opcionales en desarrollo local**: si las variables de entorno no están definidas, la app inicializa con datos mock y simula las operaciones de escritura.

### Esquema del contenedor `users`

```
{
  id:        string   // === email (partition key) → lookup O(1) por email
  email:     string
  name:      string
  role:      'estudiante' | 'docente'
  createdAt: string   // ISO 8601
}
```

### Esquema del contenedor `bots`

```
{
  id:          string   // timestamp (partition key)
  userId:      string   // email del propietario — OBLIGATORIO para getBotsByUser()
  name:        string
  subject:     string
  level:       string
  tone:        string
  welcome:     string
  restriction: 'strict' | 'guided' | 'open'
  docs:        number   // = files.length
  files:       Array<{ id: number, name: string, size: string, status: string }>
  queries:     number
  active:      boolean
  color:       string   // hex
  createdAt:   string   // ISO 8601
  updatedAt:   string   // ISO 8601
}
```

---

## Autenticación

El sistema de autenticación vive en `src/auth/AuthContext.jsx` y `src/pages/Login.jsx`.

### Flujo de pantalla (v0.3.0)

| Acción | Rol `estudiante` | Rol `docente` |
|---|---|---|
| Auto-registro | ✅ Permitido — se guarda en Cosmos DB | ❌ Bloqueado — se muestra `ROLE_RESTRICTION_MSG` |
| Inicio de sesión | ✅ Permitido | ✅ Permitido (si fue creado por un admin) |
| Inicio de sesión admin/admin | ✅ Sesión local de testeo, sin BD | ✅ Acceso directo como `docente` |

### Por qué la app DEBE mostrar Login primero (bug corregido en v0.3.0)

Sin el flag `isAuthLoading`, el flujo defectuoso era:

1. React monta `AppInner` → `isAuthenticated = false` (estado inicial) → renderiza `<Login />`.
2. El `useEffect` de `AuthProvider` lee `localStorage` → encuentra sesión guardada → `setUser(...)`.
3. `isAuthenticated` cambia a `true` → re-renderiza `AppInner` → salta directo a Dashboard.

En Azure Static Web Apps este salto era 100% reproducible en visitas recurrentes.

**Solución:** `isAuthLoading = true` hasta que el `useEffect` complete su bloque `finally`.
`AppInner` devuelve `null` durante ese tiempo, garantizando que Login/Dashboard se decida con el estado ya resuelto.

### Implementación actual (stub demo enriquecido)

En modo demo (sin BD):
- El login acepta cualquier correo.
- El usuario `admin` / `admin` es siempre válido (no requiere BD).
- El registro de estudiantes persiste en localStorage si no están configuradas las variables de entorno.

**Para producción:** reemplazar por Microsoft Entra ID con `@azure/msal-react`. No modificar la interfaz del contexto (`login`, `register`, `logout`, `user`, `isAuthenticated`, `isAuthLoading`) para que el reemplazo sea transparente.

---

## Archivos legacy (no eliminar, solo referencia)

- `src/services/claudeApi.legacy.js` — Implementación anterior para Anthropic Claude (desactivada). Útil si se migra de vuelta a Claude o a Azure OpenAI en el futuro.

---

## Lo que este agente NO debe hacer

- Instalar dependencias sin verificar que no existe una solución nativa.
- Añadir CSS en línea para estilos que pueden expresarse en CSS Modules.
- Mover lógica de negocio a componentes de vista.
- Llamar a `fetch()` directamente desde un componente (usar `src/services/`).
- Crear contenedores de Azure Storage con `publicAccessLevel` distinto de `undefined` (privado).
- Usar las credenciales VITE_* en contextos de producción del lado del cliente.
- Eliminar el archivo `.gitignore` ni modificar la entrada `.env`.
- Llamar a hooks de React después de un retorno condicional.
- Crear un bot en Cosmos DB sin el campo `userId`. Esto rompe la visibilidad por usuario.
- Guardar objetos `File` del navegador en el campo `files` de un bot. Solo metadatos serializables.
- Crear cuentas de docente mediante el flujo de auto-registro. Solo a través de administración directa en BD.
- Cambiar el texto del mensaje `ROLE_RESTRICTION_MSG` fuera de `AuthContext.jsx`. Es la única fuente de verdad.
- **Eliminar o bypassear `isAuthLoading` en `App.jsx`.** Hacerlo reactiva el bug de salto de Login en Azure.
- **Llamar a `login()` sin pasar el campo `password`.** `Login.jsx` siempre lo incluye en el objeto authData.
