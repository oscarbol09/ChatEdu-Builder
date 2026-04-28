/**
 * @fileoverview Hook de estado y lógica del chat en tiempo real.
 *
 * Extrae toda la lógica del chat del componente presentacional ChatPreview,
 * siguiendo el principio de separación de responsabilidades (AGENT.md §4).
 * ChatPreview solo renderiza; useChat gestiona el estado y los efectos.
 *
 * CAMBIOS (v0.3.5):
 * - CORRECCIÓN DE BUG STRICTMODE: la versión anterior disparaba la llamada a
 *   Gemini API dentro de la función updater de setMessages. React StrictMode
 *   invoca los updaters dos veces en desarrollo, lo que causaba dos peticiones
 *   por cada mensaje enviado. Ahora el flujo es:
 *     1. Capturar el historial actual desde la ref (messagesRef).
 *     2. Construir el array actualizado localmente.
 *     3. Actualizar el estado con setMessages (una sola vez, sin efectos secundarios).
 *     4. Llamar a la API fuera del updater, de forma secuencial y controlada.
 *   Este patrón cumple con la regla de React: los updaters deben ser funciones
 *   puras sin efectos secundarios.
 * - Se añade messagesRef para mantener siempre el valor más reciente de messages
 *   sin que el callback dependa de él en el array de dependencias de useCallback
 *   (evita recreaciñón excesiva del callback).
 *
 * CAMBIOS (v0.3.4):
 * - sendMessage pasa el historial acumulado a sendChatMessage para habilitar
 *   conversaciones multi-turn.
 * - El mensaje de bienvenida inicial NO se incluye en el historial enviado
 *   a Gemini (ya está declarado en el system prompt).
 * - Mejora de UX: el input se limpia y el loading comienza antes del await.
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
export function useChat(config, documents = []) {
  // El mensaje de bienvenida es solo UI: no se envía a Gemini como historial.
  const welcomeText = config.welcome?.trim() || '¿En qué puedo ayudarte hoy?';

  const [messages, setMessages] = useState([
    { role: 'bot', text: welcomeText },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  /**
   * Ref que siempre apunta al valor más reciente de messages.
   * Permite leer el historial actual dentro de sendMessage sin añadir
   * messages al array de dependencias de useCallback (lo que causaría
   * que el callback se recreara en cada mensaje y perdiera referencia estable).
   */
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // 1. Construir el array actualizado localmente (sin setState todavía).
    const newUserMsg    = { role: 'user', text: userMsg };
    const updatedMsgs   = [...messagesRef.current, newUserMsg];

    // 2. Actualizar el estado de forma pura (sin efectos secundarios dentro del updater).
    setMessages(updatedMsgs);

    // 3. Construir el historial para la API:
    //    - slice(1)   → excluir el mensaje de bienvenida (índice 0, ya está en system prompt).
    //    - slice(0,-1) → excluir el último mensaje del usuario (se pasa como parámetro separado).
    const historyForApi = updatedMsgs.slice(1).slice(0, -1);

    // 4. Llamar a la API fuera del updater (no hay doble invocación en StrictMode).
    try {
      const reply = await sendChatMessage(userMsg, config, historyForApi, documents);
      setMessages(curr => [...curr, { role: 'bot', text: reply }]);
    } catch (err) {
      const errorText = err.message.includes('VITE_GEMINI_API_KEY')
        ? 'Falta la API key de Gemini. Revisa la configuración del proyecto.'
        : `Error: ${err.message}`;
      setMessages(curr => [...curr, { role: 'bot', text: errorText }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, documents]);

  return { messages, input, loading, bottomRef, setInput, sendMessage };
}
