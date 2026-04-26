/**
 * @fileoverview Hook de estado y lógica del chat en tiempo real.
 *
 * Extrae toda la lógica del chat del componente presentacional ChatPreview,
 * siguiendo el principio de separación de responsabilidades (AGENT.md §4).
 * ChatPreview solo renderiza; useChat gestiona el estado y los efectos.
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
  const [messages, setMessages] = useState([
    { role: 'bot', text: config.welcome || '¡Hola! ¿En qué puedo ayudarte hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const reply = await sendChatMessage(userMsg, config);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      const errorText = err.message.includes('VITE_GEMINI_API_KEY')
        ? 'Falta la API key de Gemini. Revisa el archivo .env del proyecto.'
        : 'Error de conexión. Verifica tu red e intenta de nuevo.';
      setMessages((prev) => [...prev, { role: 'bot', text: errorText }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config]);

  return { messages, input, loading, bottomRef, setInput, sendMessage };
}
