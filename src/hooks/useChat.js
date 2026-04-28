/**
 * @fileoverview Hook de estado y lógica del chat en tiempo real.
 *
 * Extrae toda la lógica del chat del componente presentacional ChatPreview,
 * siguiendo el principio de separación de responsabilidades (AGENT.md §4).
 * ChatPreview solo renderiza; useChat gestiona el estado y los efectos.
 *
 * CAMBIOS (v0.3.4):
 * - sendMessage ahora pasa el historial acumulado a sendChatMessage para
 *   habilitar conversaciones multi-turn. El modelo recibe todo el contexto
 *   anterior y no repite el saludo en cada turno.
 * - El mensaje de bienvenida inicial NO se incluye en el historial enviado
 *   a Gemini (ya está declarado en el system prompt), evitando duplicación.
 * - Mejora de UX: el input se limpia y el loading comienza antes del await,
 *   dando feedback inmediato al usuario.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../services/geminiApi.js';

/**
 * Gestiona el ciclo de vida completo de una conversación de chat.
 *
 * @param {Object} config - Configuración del chatbot activo.
 * @returns {{
 *   messages: Array<{role: 'user'|'bot', text: string}>,
 *   input: string,
 *   loading: boolean,
 *   bottomRef: React.RefObject<HTMLDivElement>,
 *   setInput: React.Dispatch<React.SetStateAction<string>>,
 *   sendMessage: () => Promise<void>
 * }}
 */
export function useChat(config) {
  // El mensaje de bienvenida es solo UI: no se envía a Gemini como historial.
  const welcomeText = config.welcome?.trim() || '¿En qué puedo ayudarte hoy?';

  const [messages, setMessages] = useState([
    { role: 'bot', text: welcomeText },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // Añadir el mensaje del usuario al estado de forma inmediata (feedback visual).
    setMessages((prev) => {
      const updated = [...prev, { role: 'user', text: userMsg }];

      // Disparar la llamada a la API con el historial actualizado.
      // Se usa la función de actualización de setState para leer el estado
      // más reciente dentro del callback (evita closure stale).
      _callApi(updated, userMsg, config).then((reply) => {
        setMessages((curr) => [...curr, { role: 'bot', text: reply }]);
        setLoading(false);
      }).catch((err) => {
        const errorText = err.message.includes('VITE_GEMINI_API_KEY')
          ? 'Falta la API key de Gemini. Revisa la configuración del proyecto.'
          : `Error: ${err.message}`;
        setMessages((curr) => [...curr, { role: 'bot', text: errorText }]);
        setLoading(false);
      });

      return updated;
    });
  }, [input, loading, config]);

  return { messages, input, loading, bottomRef, setInput, sendMessage };
}

/**
 * Extrae la llamada a la API fuera del setState para evitar efectos secundarios
 * dentro de actualizaciones de estado de React.
 *
 * @param {Array}  fullHistory - Historial completo incluyendo el último mensaje del usuario.
 * @param {string} userMsg     - Texto del mensaje del usuario (último turno).
 * @param {Object} config      - Configuración del chatbot.
 * @returns {Promise<string>}
 */
async function _callApi(fullHistory, userMsg, config) {
  // El historial que enviamos a Gemini excluye:
  // 1. El mensaje de bienvenida inicial (índice 0, rol 'bot') — ya está en system prompt.
  // 2. El último mensaje del usuario — se pasa como parámetro separado.
  const historyForApi = fullHistory
    .slice(1)          // quitar bienvenida
    .slice(0, -1);     // quitar el último mensaje (el que acabamos de añadir)

  return sendChatMessage(userMsg, config, historyForApi);
}
