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
- [Despliegue en producción](#despliegue-en-producción)
- [Consideraciones de seguridad](#consideraciones-de-seguridad)

---

## Descripción general

ChatEdu Builder es una Single Page Application (SPA) construida con React + Vite. Su flujo principal es un asistente de 4 pasos:

1. **Documentos** — El docente sube los materiales del curso (PDF, DOCX, TXT, MD).
2. **Configuración** — Define nombre, asignatura, nivel, tono y restricciones temáticas del chatbot.
3. **Vista previa en vivo** — Interactúa con el bot antes de publicarlo. Las respuestas son generadas en tiempo real por `gemini-2.0-flash`.
4. **Despliegue** — Obtiene la URL directa y el código de iframe para integrar en cualquier LMS.

El panel principal (Dashboard) permite visualizar, gestionar y consultar analíticas de todos los bots creados.

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con         |
|-------------|----------------|-----------------------|
| Node.js     | 18.x LTS       | `node --version`      |
| npm         | 9.x            | `npm --version`       |
| Cuenta Google AI Studio | —   | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

> **Nota:** Node.js 20.x LTS es la versión recomendada. Descarga en [nodejs.org](https://nodejs.org).

---

## Instalación

```bash
# 1. Clonar el repositorio (o copiar la carpeta del proyecto)
git clone https://github.com/tu-usuario/chatedu-builder.git
cd chatedu-builder

# 2. Instalar dependencias
npm install
```

---

## Configuración

Crear el archivo de variables de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

Editar `.env` y añadir la API key de Google Gemini:

```env
VITE_GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> **Importante:** El archivo `.env` está incluido en `.gitignore`. Nunca lo subas a un repositorio público.

---

## Ejecución

### Modo desarrollo (con Hot Module Replacement)

```bash
npm run dev
```

El servidor se inicia en `http://localhost:5173` y se abre automáticamente en el navegador.

### Build de producción

```bash
npm run build
```

Genera los archivos estáticos optimizados en la carpeta `dist/`.

### Previsualizar el build de producción

```bash
npm run preview
```

Sirve el contenido de `dist/` en `http://localhost:4173`.

### Lint del código

```bash
npm run lint
```

---

## Estructura del proyecto

```
chatedu-builder/
├── index.html                        # Punto de entrada HTML
├── vite.config.js                    # Configuración de Vite
├── package.json                      # Dependencias y scripts
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore
│
└── src/
    ├── main.jsx                      # Bootstrap de React
    ├── App.jsx                       # Componente raíz — enrutamiento de vistas
    ├── App.module.css                # Layout raíz
    │
    ├── styles/
    │   └── globals.css               # Tokens de diseño, reset, base elements
    │
    ├── constants/
    │   └── index.js                  # Constantes globales de la aplicación
    │
    ├── data/
    │   └── mockData.js               # Datos de demo (bots y analítica)
    │
    ├── services/
    │   └── geminiApi.js              # Capa de comunicación con la API de Google Gemini
    │
    ├── hooks/
    │   ├── useChat.js                # Estado y lógica del chat en tiempo real
    │   └── useBots.js                # CRUD de bots (estado de la aplicación)
    │
    └── components/
        ├── layout/
        │   ├── Sidebar.jsx           # Barra de navegación lateral
        │   └── Sidebar.module.css
        │
        ├── ui/
        │   ├── StepBar.jsx           # Indicador de progreso del wizard
        │   └── StepBar.module.css
        │
        ├── dashboard/
        │   ├── Dashboard.jsx         # Vista principal: listado de bots
        │   └── Dashboard.module.css
        │
        ├── builder/
        │   ├── Builder.jsx           # Orquestador del wizard de 4 pasos
        │   ├── Builder.module.css
        │   ├── UploadZone.jsx        # Paso 1: carga de documentos
        │   ├── UploadZone.module.css
        │   ├── BotConfigForm.jsx     # Paso 2: configuración del bot
        │   ├── BotConfigForm.module.css
        │   ├── ChatPreview.jsx       # Paso 3: chat en vivo
        │   ├── ChatPreview.module.css
        │   ├── DeployPanel.jsx       # Paso 4: publicación e integración
        │   └── DeployPanel.module.css
        │
        └── analytics/
            ├── Analytics.jsx         # Vista de métricas por bot
            └── Analytics.module.css
```

---

## Stack tecnológico

| Tecnología       | Versión  | Rol                                      |
|------------------|----------|------------------------------------------|
| React            | 18.3.x   | UI framework                             |
| Vite             | 5.4.x    | Build tool y dev server                  |
| CSS Modules      | —        | Estilos encapsulados por componente       |
| Google Gemini API | REST API | Inferencia de lenguaje (`gemini-2.0-flash`) |
| Google Fonts     | CDN      | Tipografías: Syne + DM Sans              |

No se utilizan librerías de estado externas (Redux, Zustand). El estado se gestiona con hooks de React (`useState`, `useCallback`). No se utilizan librerías de componentes UI (Material, Ant, Chakra). Todo el sistema de diseño es propio.

---

## Funcionalidades

### Dashboard
- Listado de chatbots con métricas resumidas (documentos, consultas, fecha de creación).
- Indicador de estado activo/inactivo por bot.
- Acceso directo a analítica o configuración.

### Builder (wizard de 4 pasos)
- **Paso 1:** Zona de arrastre con soporte para `.pdf`, `.docx`, `.txt`, `.md`. Validación de tipos y feedback de estado.
- **Paso 2:** Formulario completo: nombre, asignatura, nivel, tono, mensaje de bienvenida y restricción temática (estricto / guiado / abierto).
- **Paso 3:** Chat en vivo conectado a la API de Gemini. El sistema prompt se construye dinámicamente desde la configuración del docente. Soporte multi-turno con historial de conversación.
- **Paso 4:** Generación de URL directa y código de iframe. Copia al portapapeles. Listado de LMS compatibles.

### Analytics
- KPIs: consultas totales, documentos base, duración promedio de sesión, tasa de satisfacción.
- Gráfico de barras de actividad semanal.
- Lista de lagunas conceptuales detectadas.

---

## Despliegue en producción

Para un despliegue seguro en producción, la llamada a la API de Gemini **no debe hacerse desde el navegador** si se quiere proteger la API key. Implementar un endpoint en servidor (Node.js/Express, Python/FastAPI, etc.) que actúe como proxy:

```
Browser → Tu servidor (guarda la API key) → Google Gemini API
```

Cambiar en `geminiApi.js`:
```js
// Reemplazar la URL directa por tu endpoint interno:
const response = await fetch('/api/chat', { ... });
```

### Opciones de despliegue del frontend
- **Vercel:** `vercel deploy` (detecta Vite automáticamente)
- **Netlify:** `netlify deploy --dir=dist`
- **GitHub Pages:** requiere `base` en `vite.config.js`

---

## Consideraciones de seguridad

- La API key nunca debe incluirse en el código fuente ni en commits.
- En producción, proteger la API key de Gemini usando un proxy del lado del servidor.
- En producción, implementar rate limiting en el proxy para evitar abuso.
- Los archivos cargados por el docente no se persisten en esta versión (procesamiento simulado). Una implementación real requiere almacenamiento seguro y procesamiento vectorial (RAG) en servidor.