# AGENT.md — ChatEdu Builder

Instrucciones para agentes de IA (Claude Code, Copilot, Cursor, etc.) que trabajen sobre este repositorio.

---

## Identidad del proyecto

ChatEdu Builder es una SPA React + Vite. Su propósito es permitir a docentes sin perfil técnico crear chatbots educativos usando sus propios materiales curriculares. El motor de inferencia es `gemini-2.0-flash` vía API REST de Google (Gemini Developer API).

---

## Reglas absolutas de arquitectura

Estas reglas no deben violarse bajo ningún pretexto. Cualquier PR que las incumpla debe ser rechazado.

### 1. Separación estricta de responsabilidades

| Capa            | Carpeta                   | Qué contiene                              | Qué NO debe contener            |
|-----------------|---------------------------|-------------------------------------------|---------------------------------|
| Estilos globales| `src/styles/`             | Tokens CSS, resets, clases de utilidad    | Lógica JS, imports de componentes |
| Estilos locales | `*.module.css` junto al componente | Estilos scoped del componente | Estilos de otros componentes   |
| Constantes      | `src/constants/index.js`  | Valores estáticos, configuración          | Funciones, hooks, JSX           |
| Datos mock      | `src/data/mockData.js`    | Estructuras de datos de demo              | Lógica de negocio, fetch        |
| Servicios       | `src/services/`           | Llamadas a APIs externas                  | Estado React, JSX               |
| Hooks           | `src/hooks/`              | Estado y efectos reutilizables            | JSX, estilos inline             |
| Componentes     | `src/components/`         | Presentación + interacción del usuario    | Llamadas `fetch()` directas     |
| App raíz        | `src/App.jsx`             | Enrutamiento de vistas                    | Lógica de negocio, estilos      |

### 2. Estilos

- **Prohibido** el uso de `style={{}}` inline en JSX salvo para valores dinámicos que no pueden expresarse como clases CSS (por ejemplo, `height: ${value}px` en barras de gráfico).
- **Prohibido** importar `globals.css` desde componentes individuales. Solo se importa en `main.jsx`.
- **Obligatorio** usar CSS Modules (`.module.css`) para estilos de componente.
- Las variables de diseño viven en `globals.css` como custom properties CSS y deben usarse con `var(--nombre)`.
- Prohibido hardcodear valores de color o espaciado. Usar siempre las custom properties.

### 3. Llamadas a la API

- **Ningún componente puede llamar a `fetch()` directamente.** Toda comunicación con APIs externas pasa por `src/services/`.
- La función `sendChatMessage` en `src/services/geminiApi.js` es el único punto de acceso a la API de Gemini.
- La API key se lee **únicamente** desde `import.meta.env.VITE_GEMINI_API_KEY`. No debe ser pasada como prop ni almacenada en estado.

### 4. Estado

- No añadir librerías de estado externas sin justificación técnica documentada.
- El estado local usa `useState`. El estado compartido entre vistas usa hooks personalizados en `src/hooks/`.

### 5. Componentes

- Los componentes son funcionales con hooks. No se usan class components.
- Un componente no debe superar 150 líneas. Si lo hace, se divide.
- Los componentes de vista no contienen lógica de negocio.

---

## Convenciones de naming

| Elemento             | Convención               | Ejemplo                        |
|----------------------|--------------------------|--------------------------------|
| Componentes          | PascalCase               | `BotConfigForm.jsx`            |
| CSS Modules          | PascalCase + `.module.css` | `BotConfigForm.module.css`   |
| Hooks                | camelCase con prefijo `use` | `useChat.js`               |
| Servicios            | camelCase + `Api`        | `geminiApi.js`                 |
| Constantes           | SCREAMING_SNAKE_CASE     | `GEMINI_MODEL`, `BUILDER_STEPS` |
| Clases CSS Modules   | camelCase                | `.chatWindow`, `.stepWrapper`  |

---

## Variables de entorno

| Variable                | Requerida | Descripción                                      |
|-------------------------|-----------|--------------------------------------------------|
| `VITE_GEMINI_API_KEY`   | Sí        | API key de Google Gemini. Prefijo `VITE_` obligatorio para Vite. Gratuita en https://aistudio.google.com/apikey |

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

## Archivos legacy (no eliminar, solo referencia)

- `ChatEduBuilder.legacy.jsx` — monolito original, antes de la refactorización.
- `src/services/claudeApi.legacy.js` — implementación anterior para Anthropic Claude (desactivada). Útil si se migra de vuelta a Claude en el futuro.

---

## Lo que este agente NO debe hacer

- Instalar dependencias sin verificar que no existe una solución nativa.
- Añadir CSS en línea para estilos que pueden expresarse en CSS Modules.
- Mover lógica de negocio a componentes de vista.
- Usar la API key de Gemini en producción directamente desde el cliente (solo para demos).
- Eliminar el archivo `.gitignore` ni modificar la entrada `.env`.
