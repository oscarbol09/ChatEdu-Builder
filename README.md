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
- [Autenticación](#autenticación)
- [Despliegue en producción — Azure](#despliegue-en-producción--azure)
- [Consideraciones de seguridad](#consideraciones-de-seguridad)

---

## Descripción general

ChatEdu Builder es una Single Page Application (SPA) construida con React + Vite. Su flujo principal es un asistente de 4 pasos:

1. **Documentos** — El docente sube los materiales del curso (PDF, DOCX, TXT, MD). Los archivos se guardan en Azure Blob Storage.
2. **Configuración** — Define nombre, asignatura, nivel, tono y restricciones temáticas del chatbot.
3. **Vista previa en vivo** — Interactúa con el bot antes de publicarlo. Las respuestas son generadas en tiempo real por `gemini-2.5-flash`.
4. **Despliegue** — Obtiene la URL directa y el código de iframe para integrar en cualquier LMS.

El panel principal (Dashboard) permite visualizar, gestionar y consultar analíticas de todos los bots creados. Los bots se persisten en Azure Cosmos DB.

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
    │   └── AuthContext.jsx           # Contexto de autenticación (demo → Entra ID en prod.)
    │
    ├── pages/
    │   ├── Login.jsx                 # Pantalla de inicio de sesión
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
    │   ├── db.js                     # Acceso a Azure Cosmos DB
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
| Azure Cosmos DB | SDK v4 | Persistencia de bots |
| Azure Blob Storage | SDK v12 | Almacenamiento de documentos |
| Azure Static Web Apps | — | Hosting del frontend |
| Google Fonts | CDN | Tipografías: Syne + DM Sans |

---

## Funcionalidades

### Dashboard
- Listado de chatbots con métricas resumidas (documentos, consultas, fecha de creación).
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

## Autenticación

En la versión actual (0.1.x), la autenticación es **simulada** para fines de demostración: acepta cualquier dirección de correo electrónico sin contraseña.

El sistema está implementado en `src/auth/AuthContext.jsx` y `src/pages/Login.jsx`. El estado del usuario se persiste en `localStorage` durante la sesión.

**Para producción:** reemplazar por **Microsoft Entra ID (Azure AD)** usando la librería oficial:

```bash
npm install @azure/msal-browser @azure/msal-react
```

Azure Static Web Apps también ofrece autenticación integrada con Microsoft, GitHub y Google sin código adicional, activable desde el portal de Azure.

---

## Despliegue en producción — Azure

El proyecto está configurado para desplegarse en **Azure Static Web Apps** mediante CI/CD automático con GitHub Actions.

### Flujo de despliegue actual

Cada push a `main` dispara el workflow `.github/workflows/azure-static-web-apps-*.yml`, que:
1. Hace checkout del código.
2. Ejecuta `vite build` (output en `build/`).
3. Sube el resultado a Azure Static Web Apps.

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
