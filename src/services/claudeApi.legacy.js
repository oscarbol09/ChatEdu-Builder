/**
 * @fileoverview Capa de comunicación con la API de Anthropic.
 *
 * REGLA CRÍTICA (AGENT.md §3):
 * Este es el ÚNICO archivo de la aplicación que realiza llamadas fetch() a Anthropic.
 * Ningún componente ni hook debe importar fetch() directamente para llamar a la API.
 *
 * Para producción: reemplazar API_URL por el endpoint de tu proxy en servidor,
 * y eliminar el header 'anthropic-dangerous-direct-browser-access'.
 * Ejemplo: const API_URL = '/api/chat';
 */

import { CLAUDE_MODEL } from '../constants/index.js';

/** Endpoint de la API de Anthropic. En producción, reemplazar por proxy interno. */
const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Construye el system prompt dinámico a partir de la configuración del chatbot.
 * @param {Object} config - Configuración activa del chatbot.
 * @param {string} config.name - Nombre del chatbot.
 * @param {string} config.subject - Asignatura.
 * @param {string} config.level - Nivel educativo.
 * @param {string} config.tone - Tono de comunicación.
 * @returns {string} System prompt formateado listo para la API.
 */
function buildSystemPrompt(config) {
  return (
    `Eres ${config.name || 'un asistente educativo'}, ` +
    `un chatbot pedagógico para la asignatura de ${config.subject || 'educación general'} ` +
    `en nivel ${config.level || 'general'}. ` +
    `Tono: ${config.tone || 'amigable'}. ` +
    `Responde en español, de forma breve y educativa (máximo 3 oraciones). ` +
    `No uses markdown con asteriscos.`
  );
}

/**
 * Envía un mensaje del usuario al modelo Claude y devuelve la respuesta en texto.
 *
 * @param {string} userMessage - Texto que el usuario envió al chat.
 * @param {Object} config - Configuración activa del chatbot.
 * @returns {Promise<string>} Texto de respuesta generado por el modelo.
 * @throws {Error} Si la API key no está definida, la respuesta HTTP falla,
 *                 o el contenido de la respuesta está vacío.
 *
 * @example
 * const reply = await sendChatMessage('¿Qué es una matriz?', botConfig);
 */
export async function sendChatMessage(userMessage, config) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY no está definida. ' +
      'Crea un archivo .env en la raíz del proyecto con esta variable.'
    );
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Requerido para llamadas directas desde el navegador (solo desarrollo/demo).
      // Eliminar este header al migrar a un proxy en servidor.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      system: buildSystemPrompt(config),
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de API Anthropic: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text;

  if (!reply) {
    throw new Error('La API no devolvió contenido de texto válido.');
  }

  return reply;
}
