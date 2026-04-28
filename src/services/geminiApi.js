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
 *
 * CAMBIOS (v0.4.0):
 * - buildSystemPrompt ahora acepta un segundo parámetro `documents` (array de strings).
 *   Si el docente subió archivos .txt o .md y se extrajo su contenido en UploadZone,
 *   el texto se inyecta en el system prompt bajo la sección "Materiales del curso".
 *   Esto permite al chatbot responder con base en el contenido real del docente,
 *   sin necesidad de embeddings ni RAG en el backend.
 *   Limitación conocida: el contexto de Gemini tiene un límite de tokens. Para
 *   documentos muy grandes, el texto se trunca a MAX_DOC_CHARS por documento.
 *
 * CAMBIOS (v0.3.4):
 * - sendChatMessage ahora recibe el historial completo de la conversación
 *   y lo mapea al formato multi-turn de Gemini (contents array).
 * - maxOutputTokens aumentado de 300 a 1024.
 * - System prompt reescrito: más natural y profesional.
 * - temperature subida a 0.9 para respuestas más fluidas.
 */

import { GEMINI_MODEL } from '../constants/index.js';

/** Endpoint base de la API de Gemini. La API key va como query param. */
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Número máximo de caracteres por documento inyectado en el prompt.
 * Gemini 2.5 Flash tiene ventana de ~1M tokens, pero limitar evita
 * costos altos si se actualiza el modelo y la restricción cambia.
 * ~8000 chars ≈ ~2000 tokens por documento.
 */
const MAX_DOC_CHARS = 8000;

/**
 * Construye el system prompt pedagógico desde la configuración del chatbot.
 * Si se proporcionan documentos con contenido extraído, los inyecta como
 * sección de contexto para que el modelo los use en sus respuestas.
 *
 * @param {Object}   config    - Configuración del chatbot.
 * @param {string[]} documents - Contenido textual de los archivos subidos (puede estar vacío).
 * @returns {string}
 */
function buildSystemPrompt(config, documents = []) {
  const restriction = {
    strict:  'Responde únicamente sobre los temas de la asignatura. Si te preguntan algo fuera del tema, redirige amablemente.',
    guided:  'Puedes contextualizar con conocimiento general cuando sea útil para el aprendizaje.',
    open:    'Puedes responder sobre cualquier tema con libertad.',
  }[config.restriction] ?? 'Puedes contextualizar con conocimiento general cuando sea útil.';

  const toneMap = {
    'Formal y académico':    'Usa un tono formal y académico.',
    'Amigable y cercano':    'Usa un tono amigable y cercano, como un tutor que conoce bien al estudiante.',
    'Socrático (preguntas)': 'Usa el método socrático: responde con preguntas que guíen al estudiante a descubrir la respuesta.',
    'Conciso y directo':     'Sé conciso y directo. Ve al punto sin rodeos.',
    'Motivacional':          'Usa un tono motivacional que aliente al estudiante a seguir aprendiendo.',
    'Paso a paso (didáctico)': 'Explica paso a paso de forma didáctica, como si estuvieras en clase.',
  };
  const toneInstruction = toneMap[config.tone] ?? `Tono: ${config.tone}.`;

  // Sección de documentos: se añade solo si hay contenido extraído disponible.
  let documentSection = '';
  const validDocs = documents.filter((d) => typeof d === 'string' && d.trim().length > 0);
  if (validDocs.length > 0) {
    const docTexts = validDocs
      .map((d, i) => `--- Documento ${i + 1} ---\n${d.slice(0, MAX_DOC_CHARS)}${d.length > MAX_DOC_CHARS ? '\n[...truncado]' : ''}`)
      .join('\n\n');
    documentSection = `\n\nMATERIALES DEL CURSO (usa esta información como base para tus respuestas):\n${docTexts}\n--- Fin de los materiales ---`;
  }

  return [
    `Eres ${config.name || 'un asistente educativo'}, un tutor especializado en ${config.subject || 'educación'} para estudiantes de nivel ${config.level || 'universitario'}.`,
    toneInstruction,
    `Responde siempre en español.`,
    `Sé natural y conversacional: no repitas saludos en cada mensaje, no empieces siempre con "¡Hola!". Continúa la conversación de forma fluida según el contexto.`,
    `Usa párrafos claros. Puedes usar listas cuando ayude a la claridad, pero evita el abuso de formato.`,
    restriction,
    config.welcome ? `Tu mensaje de bienvenida inicial fue: "${config.welcome}". No lo repitas, ya fue enviado.` : '',
    documentSection,
  ].filter(Boolean).join(' ');
}

/**
 * Convierte el historial interno del chat al formato multi-turn de Gemini.
 * Gemini alterna roles 'user' y 'model'. El primer mensaje de bienvenida
 * del bot se mapea como rol 'model' para establecer el contexto.
 *
 * @param {Array<{role: 'user'|'bot', text: string}>} history
 * @returns {Array<{role: 'user'|'model', parts: [{text: string}]}>}
 */
function buildContents(history) {
  return history.map((msg) => ({
    role:  msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
}

/**
 * Envía un mensaje al modelo Gemini con el historial completo de la conversación.
 *
 * @param {string}   userMessage - Texto que el usuario envió al chat.
 * @param {Object}   config      - Configuración activa del chatbot.
 * @param {Array}    history     - Historial de mensajes hasta ahora (sin incluir userMessage).
 * @param {string[]} [documents] - Contenido extraído de los documentos del docente.
 * @returns {Promise<string>} Texto de respuesta del modelo.
 * @throws {Error} Si la API key no está definida o la petición falla.
 */
export async function sendChatMessage(userMessage, config, history = [], documents = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY no está definida. ' +
      'Consigue tu API key gratis en https://aistudio.google.com/apikey ' +
      'y agrégala al archivo .env'
    );
  }

  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Construir el historial en formato Gemini + el nuevo mensaje del usuario.
  const contents = [
    ...buildContents(history),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemPrompt(config, documents) }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature:     0.9,
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
