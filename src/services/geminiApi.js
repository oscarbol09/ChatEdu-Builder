/**
 * @fileoverview Capa de comunicación con la API de Google Gemini — cliente React/Vite.
 *
 * v1.0.0 — Migración a Azure Functions proxy (Paso 1 de seguridad).
 *
 * CAMBIO DE ARQUITECTURA:
 * Esta capa ya NO llama directamente a googleapis.com ni usa VITE_GEMINI_API_KEY.
 * El mensaje y la configuración se envían a /api/chat (Azure Function), que
 * gestiona la API key de Gemini en el servidor y devuelve { reply: string }.
 *
 * buildSystemPrompt y buildContents se movieron a api/src/functions/chat.js.
 *
 * La firma de sendChatMessage es idéntica a la versión anterior para no romper
 * el hook useChat ni ningún componente existente.
 *
 * REGLA CRÍTICA (AGENT.md §3):
 * Este sigue siendo el ÚNICO archivo que realiza llamadas fetch() a /api/chat.
 * Ningún componente ni hook debe llamar a fetch() directamente.
 */

/**
 * Envía un mensaje al modelo Gemini a través de la Azure Function proxy.
 *
 * @param {string}   userMessage - Texto que el usuario envió al chat.
 * @param {Object}   config      - Configuración activa del chatbot.
 * @param {Array}    history     - Historial de mensajes { role: 'user'|'bot', text: string }[].
 * @param {string[]} [documents] - Contenido textual extraído de documentos del docente.
 * @returns {Promise<string>} Texto de respuesta del modelo.
 * @throws {Error} Si la petición falla o el servidor devuelve un error.
 */
export async function sendChatMessage(userMessage, config, history = [], documents = []) {
  const res = await fetch('/api/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage,
      config,
      history,
      documents,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error ?? `Error HTTP ${res.status} al contactar el servicio de chat`
    );
  }

  if (!data.reply) {
    throw new Error('El servidor no devolvió una respuesta de texto válida.');
  }

  return data.reply;
}
