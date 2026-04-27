# ChatEdu Builder

Plataforma no-code para crear, configurar y desplegar chatbots educativos contextualizados, impulsada por Google Gemini AI. Permite a docentes sin perfil técnico construir asistentes pedagógicos a partir de sus propios materiales curriculares en menos de 5 minutos.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Stack tecnológico](#stack-tecnológico)
- [Funcionalidades](#funcionalidades)
- [Autenticación y roles](#autenticación-y-roles)
- [Persistencia de bots](#persistencia-de-bots)
- [Despliegue en producción — Azure](#despliegue-en-producción--azure)
- [Consideraciones de seguridad](#consideraciones-de-seguridad)

---

## Descripción general

ChatEdu Builder es una Single Page Application (SPA) construida con React + Vite. Su flujo principal es un asistente de 4 pasos:

1. **Documentos** — El docente sube los materiales del curso (PDF, DOCX, TXT, MD). Los archivos se guardan en Azure Blob Storage.
2. **Configuración** — Define nombre, asignatura, nivel, tono y restricciones temáticas del chatbot.
3. **Vista previa en vivo** — Interactúa con el bot antes de publicarlo. Las respuestas son generadas en tiempo real por `gemini-2.5-flash`.
4. **Despliegue** — Obtiene la URL directa y el código de iframe para integrar en cualquier LMS.

El panel principal (Dashboard) permite visualizar, gestionar y consultar analíticas de todos los bots creados. Los bots se persisten en Azure Cosmos DB asociados al usuario propietario.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | `npm --version` |
| Cuenta Google AI Studio | — | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Suscripción Azure (opcional) | — | Para Cosmos DB y Blob Storage |

> **Nota:** Node.js 20.x LTS es la versión recomendada. Descarga en [nodejs.org](https://nodejs.org).

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/chatedu-builder.git
cd chatedu-builder

# 2. Instalar dependencias
npm install
```

---

## Configuración

Crear el archivo de variables de entorno a partir de la plantilla:

```bash
cp .env.example .env
```

Editar `.env` con los valores reales:

```env
# API key de Google Gemini (obligatoria para el chat)
VITE_GEMINI_API_KEY=AIzaSy_TU_API_KEY

# Azure Cosmos DB (opcional — sin estas variables la app usa datos locales)
VITE_COSMOS_ENDPOINT=https://TU_CUENTA.documents.azure.com:443/
VITE_COSMOS_KEY=TU_CLAVE_PRIMARIA

# Azure Blob Storage (opcional — sin esta variable la carga de archivos es simulada)
VITE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=TU_CUENTA;AccountKey=TU_CLAVE;EndpointSuffix=core.windows.net
```

> **Importante:** El archivo `.env` está incluido en `.gitignore`. Nunca lo subas a un repositorio.  
> Las variables `VITE_*` son visibles en el bundle del cliente — úsalas SOLO en desarrollo local.  
> En producción, estas credenciales deben vivir en Azure Functions + Key Vault (ver sección de despliegue).

---

## Ejecución

### Modo desarrollo

```bash
npm run dev
# Servidor en http://localhost:5173
```

### Build de producción

```bash
npm run build
# Genera los archivos estáticos en la carpeta build/
```

### Previsualizar el build

```bash
npm run preview
# Sirve build/ en http://localhost:4173
```

### Lint

```bash
npm run lint
```

---

## Estructura del proyecto

```
chatedu-builder/
├── index.html                        # Punto de entrada HTML
├── vite.config.js                    # Configuración de Vite (outDir: 'build')
├── package.json                      # Dependencias y scripts
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore
├── AGENT.md                          # Instrucciones para agentes de IA
├── .github/
│   └── workflows/
│       └── azure-static-web-apps-*.yml  # CI/CD → Azure Static Web Apps
│
└── src/
    ├── main.jsx                      # Bootstrap de React
    ├── App.jsx                       # Enrutamiento de vistas + guard de auth
    ├── App.module.css
    │
    ├── auth/
    │   └── AuthContext.jsx           # Contexto de autenticación: login, register, logout
    │
    ├── pages/
    │   ├── Login.jsx                 # Pantalla con modos Iniciar sesión / Crear cuenta
    │   └── Login.module.css
    │
    ├── styles/
    │   └── globals.css               # Tokens de diseño, reset, base elements
    │
    ├── constants/
    │   └── index.js                  # Constantes globales (modelo IA, opciones de formulario…)
    │
    ├── data/
    │   └── mockData.js               # Datos de demo (bots y analítica)
    │
    ├── services/
    │   ├── geminiApi.js              # Llamadas a Google Gemini API
    │   ├── db.js                     # Acceso a Azure Cosmos DB (bots + usuarios)
    │   ├── storage.js                # Acceso a Azure Blob Storage
    │   └── claudeApi.legacy.js       # [Legacy] Implementación anterior para Anthropic Claude
    │
    ├── hooks/
    │   ├── useChat.js                # Estado y lógica del chat en tiempo real
    │   └── useBots.js                # CRUD de bots (Cosmos DB + fallback local)
    │
    └── components/
        ├── layout/
        │   ├── Sidebar.jsx
        │   └── Sidebar.module.css
        ├── ui/
        │   ├── StepBar.jsx
        │   └── StepBar.module.css
        ├── dashboard/
        │   ├── Dashboard.jsx
        │   └── Dashboard.module.css
        ├── builder/
        │   ├── Builder.jsx
        │   ├── UploadZone.jsx
        │   ├── BotConfigForm.jsx
        │   ├── ChatPreview.jsx
        │   ├── DeployPanel.jsx
        │   └── *.module.css
        └── analytics/
            ├── Analytics.jsx
            └── Analytics.module.css
```

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.x | UI framework |
| Vite | 5.4.x | Build tool y dev server |
| CSS Modules | — | Estilos encapsulados por componente |
| Google Gemini API | REST | Inferencia de lenguaje (`gemini-2.5-flash`) |
| Azure Cosmos DB | SDK v4 | Persistencia de bots y usuarios |
| Azure Blob Storage | SDK v12 | Almacenamiento de documentos |
| Azure Static Web Apps | — | Hosting del frontend |
| Google Fonts | CDN | Tipografías: Syne + DM Sans |

---

## Funcionalidades

### Dashboard
- Listado de chatbots **del usuario autenticado** con métricas resumidas (documentos, consultas, fecha de creación).
- Indicador de estado activo/inactivo por bot.
- Acceso directo a analítica o configuración.

### Builder (wizard de 4 pasos)
- **Paso 1:** Zona de arrastre con soporte para `.pdf`, `.docx`, `.txt`, `.md`. Subida a Azure Blob Storage.
- **Paso 2:** Formulario completo: nombre, asignatura, nivel, tono, mensaje de bienvenida y restricción temática.
- **Paso 3:** Chat en vivo conectado a la API de Gemini. Soporte multi-turno con historial de conversación.
- **Paso 4:** Generación de URL directa y código de iframe para integración en LMS.

### Analytics
- KPIs: consultas totales, documentos base, duración promedio, tasa de satisfacción.
- Gráfico de actividad semanal.
- Lista de lagunas conceptuales detectadas.

---

## Autenticación y roles

### Guard de autenticación — por qué siempre inicia en Login (v0.3.0)

La app **siempre debe mostrar el Login al acceder**, incluso si el navegador tiene una sesión anterior guardada. Esto se garantiza con el flag `isAuthLoading` en `AuthContext`:

- Al montar la app, `isAuthLoading = true`.
- `AppInner` en `App.jsx` devuelve `null` mientras `isAuthLoading` es `true`.
- El `useEffect` que lee `localStorage` pone `isAuthLoading = false` en su bloque `finally`.
- Solo entonces `AppInner` decide si mostrar `<Login />` o `<AppAuthenticated />`.

**Bug que esto corrige:** sin este flag, en visitas recurrentes desde Azure el localStorage ya contenía una sesión guardada. El primer render veía `isAuthenticated=false` y mostraba Login, pero un tick después se hidrataba el usuario y la app saltaba directamente al Dashboard sin que el usuario hubiera introducido credenciales en esa sesión.

### Usuario de prueba para testeo

| Campo | Valor |
|---|---|
| Email / usuario | `admin` |
| Contraseña | `admin` |
| Rol | `docente` |
| Requiere BD | No |

Este usuario está definido en `AuthContext.jsx` como `TEST_ADMIN_*`. Funciona sin Cosmos DB ni variables de entorno. Útil para probar el flujo completo en Azure desde el primer día.

> **Antes de producción real:** eliminar las constantes `TEST_ADMIN_*` en `AuthContext.jsx`.

### Flujo de pantalla (v0.3.0)

| Tab | Descripción |
|---|---|
| **Iniciar sesión** | Verifica el usuario en Cosmos DB. Si no existe, crea una sesión demo en localStorage. |
| **Crear cuenta** | Registra un nuevo usuario en Cosmos DB. Solo disponible para el rol Estudiante. |

### Reglas de rol

| Rol | Auto-registro | Notas |
|---|---|---|
| `estudiante` | ✅ Permitido | Se persiste en el contenedor `users` de Cosmos DB. |
| `docente` | ❌ Bloqueado | Muestra el aviso de restricción. Solo un administrador puede crear esta cuenta en BD. |

**Aviso de restricción (texto canónico):**
> "La creación de cuentas para Docentes/Profesores está restringida. Por favor, comuníquese con el administrador del sistema para solicitar su acceso."

La validación ocurre en dos capas:
1. **Frontend:** el botón "Crear cuenta" se deshabilita y se muestra el aviso cuando el rol seleccionado es Docente/Profesor.
2. **AuthContext:** `register()` lanza un error si el rol pertenece al conjunto `RESTRICTED_ROLES`, como segunda línea de defensa.

### Esquema del documento de usuario en Cosmos DB

```json
{
  "id":        "usuario@ejemplo.com",
  "email":     "usuario@ejemplo.com",
  "name":      "Nombre del usuario",
  "role":      "estudiante",
  "createdAt": "2025-04-26T18:00:00.000Z"
}
```

> El campo `id` es igual al email, lo que permite búsquedas O(1) por partition key sin consultas cross-partition.

### Para producción

Reemplazar por **Microsoft Entra ID (Azure AD)** usando la librería oficial:

```bash
npm install @azure/msal-browser @azure/msal-react
```

La interfaz del contexto (`login`, `register`, `logout`, `user`, `isAuthenticated`, `isAuthLoading`) no debe cambiar al hacer el reemplazo.

---

## Persistencia de bots

### Cómo funciona (v0.2.0)

1. Al iniciar sesión, `useBots.js` llama a `initDB()` para verificar/crear los contenedores.
2. Se consulta `getBotsByUser(user.email)` que filtra los bots por el campo `userId`.
3. Si la BD no está disponible, el hook cae a los datos de demo (`MOCK_BOTS`).
4. Al crear o editar un bot, el documento se guarda en Cosmos DB y se actualiza el estado local.

### Esquema del documento de bot en Cosmos DB

```json
{
  "id":          "1714156800000",
  "userId":      "docente@universidad.edu.co",
  "name":        "Tutor de Economía Circular",
  "subject":     "Economía Circular",
  "level":       "Universitario",
  "tone":        "Amigable y cercano",
  "welcome":     "¡Hola! Soy tu asistente de Economía Circular.",
  "restriction": "guided",
  "docs":        3,
  "files": [
    { "id": 1714156800001, "name": "guia_curso.pdf", "size": "1.2 MB", "status": "ready" }
  ],
  "queries":   0,
  "active":    true,
  "color":     "#3D44A8",
  "createdAt": "2025-04-26T18:00:00.000Z",
  "updatedAt": "2025-04-26T18:00:00.000Z"
}
```

> **Nota arquitectural:** el contenedor `bots` usa `partitionKey: '/id'`. Las consultas por `userId` son cross-partition. Para producción a gran escala, recrear el contenedor con `partitionKey: '/userId'`.

### Disponibilidad tras recargar la página

- Los bots creados se cargan desde Cosmos DB en cada montaje del hook.
- Si el usuario no tiene bots en BD, el dashboard muestra una lista vacía (correcto para usuarios nuevos).
- Los datos de demo (`MOCK_BOTS`) solo aparecen si la BD no está disponible.

---

## Despliegue en producción — Azure

El proyecto está configurado para desplegarse en **Azure Static Web Apps** mediante CI/CD automático con GitHub Actions.

### Flujo de despliegue actual

Cada push a `main` dispara el workflow `.github/workflows/azure-static-web-apps-*.yml`, que:
1. Hace checkout del código.
2. Ejecuta `vite build` (output en `build/`).
3. Sube el resultado a Azure Static Web Apps.

> **Importante sobre variables de entorno:** Vite incrusta las variables `VITE_*` en el bundle **durante el build**. Si agregas o modificas variables en el portal de Azure **después** de un deploy, el cambio no tendrá efecto hasta que el workflow vuelva a ejecutarse. Para forzar un re-deploy sin cambios de código:
>
> ```bash
> git commit --allow-empty -m "chore: trigger redeploy"
> git push
> ```

### Variables de entorno en producción

Las variables `VITE_*` deben registrarse como **Secrets** en GitHub:
`GitHub → Repositorio → Settings → Secrets and variables → Actions`

| Secret | Descripción |
|---|---|
| `VITE_GEMINI_API_KEY` | API key de Google Gemini |
| `VITE_COSMOS_ENDPOINT` | Endpoint de Cosmos DB |
| `VITE_COSMOS_KEY` | Clave primaria de Cosmos DB |
| `VITE_STORAGE_CONNECTION_STRING` | Connection string de Blob Storage |

### Arquitectura objetivo (roadmap)

Para eliminar por completo las credenciales del cliente, la arquitectura recomendada es:

```
[React SPA — Azure Static Web Apps]
        │ /api/*
        ▼
[Azure Functions — Node.js]   ← proxy seguro
        │              │
[Azure Cosmos DB]  [Azure Blob Storage]
        └─── Managed Identity + Key Vault (sin credenciales en código)
        │
[Google Gemini API o Azure OpenAI]
```

---

## Consideraciones de seguridad

- El archivo `.env` nunca debe subirse al repositorio (está en `.gitignore`).
- Las variables `VITE_*` se incrustan en el bundle del cliente: **son visibles por el usuario final**. Solo usarlas en desarrollo local.
- En producción, toda la lógica de Cosmos DB, Blob Storage y llamadas a la API de IA debe vivir en Azure Functions con Managed Identity.
- Los documentos en Blob Storage son **privados por defecto** (sin `publicAccessLevel`). El acceso debe gestionarse con SAS tokens de corta duración generados en el servidor.
- Implementar rate limiting en el proxy de Azure Functions para evitar abuso de la API de IA.
- La validación de roles en el registro ocurre en `AuthContext.jsx`. En producción con Entra ID, esta validación debe también ocurrir en el backend (Azure Functions) antes de asignar permisos.
- **El usuario de prueba `admin/admin` debe eliminarse antes de desplegar en un entorno con usuarios reales.** Ver constantes `TEST_ADMIN_*` en `AuthContext.jsx`.
