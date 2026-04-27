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
- Las funciones en `src/services/db.js` son el único punto de acceso a Azure Cosmos DB.
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
| Azure Cosmos DB | `src/services/db.js` | Persiste los bots del usuario. Base de datos: `chatedu`, contenedor: `bots`. |
| Azure Blob Storage | `src/services/storage.js` | Almacena los documentos subidos por el docente. Contenedor: `documents` (privado). |

Ambos servicios son **opcionales en desarrollo local**: si las variables de entorno no están definidas, la app inicializa con datos mock y simula las operaciones de escritura.

---

## Autenticación

El sistema de autenticación vive en `src/auth/AuthContext.jsx` y `src/pages/Login.jsx`.

La implementación actual es un **stub de demostración** que acepta cualquier email sin contraseña.

**Para producción:** reemplazar por Microsoft Entra ID con `@azure/msal-react`. No modificar la interfaz del contexto (`login`, `logout`, `user`, `isAuthenticated`) para que el reemplazo sea transparente para el resto de la app.

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
