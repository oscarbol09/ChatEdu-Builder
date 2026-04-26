/**
 * @fileoverview Capa de comunicación con la API de Google Gemini.
 *
 * REGLA CRÍTICA (AGENT.md §3):
 * Este es el ÚNICO archivo que realiza llamadas fetch() a una API externa.
 * Ningún componente ni hook debe llamar a fetch() directamente.
 *
 * Modelo activo: gemini-2.5-flash (free tier, sin tarjeta de crédito).
 * API key gratuita en: https://aistudio.google.com/apikey
 *
 * Free tier actual (por proyecto de Google Cloud):
 *   - 10 requests/minuto
 *   - 250 requests/día
 *   Suficiente para demos y presentaciones universitarias.
 */

import { GEMINI_MODEL } from '../constants/index.js';

/** Endpoint base de la API de Gemini. La API key va como query param. */
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Construye el system prompt pedagógico desde la configuración del chatbot.
 * @param {Object} config
 * @returns {string}
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
 * Envía un mensaje al modelo Gemini y devuelve la respuesta en texto.
 *
 * @param {string} userMessage - Texto que el usuario envió al chat.
 * @param {Object} config - Configuración activa del chatbot.
 * @returns {Promise<string>} Texto de respuesta del modelo.
 * @throws {Error} Si la API key no está definida o la petición falla.
 */
export async function sendChatMessage(userMessage, config) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY no está definida. ' +
      'Consigue tu API key gratis en https://aistudio.google.com/apikey ' +
      'y agrégala al archivo .env'
    );
  }

  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // System instruction: equivalente al system prompt de Anthropic
      system_instruction: {
        parts: [{ text: buildSystemPrompt(config) }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Error de API Gemini: ${response.status} — ${err?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    throw new Error('La API de Gemini no devolvió contenido de texto válido.');
  }

  return reply;
}
