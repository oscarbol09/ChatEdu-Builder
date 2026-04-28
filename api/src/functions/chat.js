/**
 * @fileoverview Azure Function — Proxy seguro para Google Gemini API.
 *
 * Ruta expuesta:
 *   POST /api/chat
 *
 * Body esperado (JSON):
 *   {
 *     userMessage: string,
 *     config:      Object,   // configuración del chatbot (name, subject, tone, etc.)
 *     history:     Array,    // historial { role: 'user'|'bot', text: string }[]
 *     documents:   string[]  // textos extraídos de documentos del docente (puede ser [])
 *   }
 *
 * La GEMINI_API_KEY NUNCA sale del servidor. El cliente React solo envía
 * el mensaje y la configuración; recibe { reply: string }.
 *
 * La lógica de buildSystemPrompt y buildContents se movió aquí desde
 * src/services/geminiApi.js del cliente, que ahora solo hace fetch('/api/chat').
 */

import { app } from '@azure/functions';
import { corsHeaders, handlePreflight } from '../lib/cors.js';

const GEMINI_MODEL  = 'gemini-2.5-flash';
const API_BASE      = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_DOC_CHARS = 8000;

// ─── Helpers (idénticos a la versión cliente — ahora solo viven en el servidor) ─

function buildSystemPrompt(config, documents = []) {
  const restriction = {
    strict:  'Responde únicamente sobre los temas de la asignatura. Si te preguntan algo fuera del tema, redirige amablemente.',
    guided:  'Puedes contextualizar con conocimiento general cuando sea útil para el aprendizaje.',
    open:    'Puedes responder sobre cualquier tema con libertad.',
  }[config.restriction] ?? 'Puedes contextualizar con conocimiento general cuando sea útil.';

  const toneMap = {
    'Formal y académico':      'Usa un tono formal y académico.',
    'Amigable y cercano':      'Usa un tono amigable y cercano, como un tutor que conoce bien al estudiante.',
    'Socrático (preguntas)':   'Usa el método socrático: responde con preguntas que guíen al estudiante a descubrir la respuesta.',
    'Conciso y directo':       'Sé conciso y directo. Ve al punto sin rodeos.',
    'Motivacional':            'Usa un tono motivacional que aliente al estudiante a seguir aprendiendo.',
    'Paso a paso (didáctico)': 'Explica paso a paso de forma didáctica, como si estuvieras en clase.',
  };
  const toneInstruction = toneMap[config.tone] ?? `Tono: ${config.tone}.`;

  let documentSection = '';
  const validDocs = documents.filter((d) => typeof d === 'string' && d.trim().length > 0);
  if (validDocs.length > 0) {
    const docTexts = validDocs
      .map((d, i) =>
        `--- Documento ${i + 1} ---\n${d.slice(0, MAX_DOC_CHARS)}${d.length > MAX_DOC_CHARS ? '\n[...truncado]' : ''}`
      )
      .join('\n\n');
    documentSection =
      `\n\nMATERIALES DEL CURSO (usa esta información como base para tus respuestas):\n${docTexts}\n--- Fin de los materiales ---`;
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

function buildContents(history) {
  return history.map((msg) => ({
    role:  msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────

app.http('chat', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'chat',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const body = await request.json();
      const { userMessage, config, history = [], documents = [] } = body ?? {};

      if (!userMessage || !config) {
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'Se requieren los campos userMessage y config.' }),
        };
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        context.error('GEMINI_API_KEY no está configurada en Application Settings.');
        return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Configuración del servidor incompleta.' }) };
      }

      const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const contents = [
        ...buildContents(history),
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      const geminiRes = await fetch(url, {
        method:  'POST',
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

      if (!geminiRes.ok) {
        const errBody = await geminiRes.json().catch(() => ({}));
        const msg     = errBody?.error?.message ?? geminiRes.statusText;
        context.error(`Gemini API error ${geminiRes.status}:`, msg);
        return {
          status:  geminiRes.status,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: `Error de Gemini API: ${msg}` }),
        };
      }

      const data  = await geminiRes.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        return {
          status:  502,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'Gemini no devolvió contenido de texto válido.' }),
        };
      }

      return {
        status:  200,
        headers: corsHeaders(),
        body:    JSON.stringify({ reply }),
      };
    } catch (err) {
      context.error('chat handler:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});
