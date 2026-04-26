/**
 * @fileoverview Vista previa del chat en vivo (Paso 3 del wizard).
 * Componente presentacional puro: delega toda la lógica a useChat.
 */

import styles from './ChatPreview.module.css';
import { useChat } from '../../hooks/useChat.js';

/**
 * @param {Object} props
 * @param {Object} props.config - Configuración activa del chatbot.
 */
export default function ChatPreview({ config }) {
  const { messages, input, loading, bottomRef, setInput, sendMessage } = useChat(config);

  return (
    <div className={styles.container}>
      {/* Header del chat */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className={styles.botName}>{config.name || 'Chatbot educativo'}</p>
          <p className={styles.botMeta}>{config.subject} · {config.level}</p>
        </div>
        <div className={styles.statusDot} />
      </div>

      {/* Historial de mensajes */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.messageRow} ${m.role === 'user' ? styles.messageRowUser : ''}`}>
            <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Indicador de escritura */}
        {loading && (
          <div className={styles.typingRow}>
            <div className={styles.typingBubble}>
              <span className={styles.dot} style={{ animationDelay: '0s' }} />
              <span className={styles.dot} style={{ animationDelay: '0.2s' }} />
              <span className={styles.dot} style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input de envío */}
      <div className={styles.inputArea}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe una pregunta al chatbot..."
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
