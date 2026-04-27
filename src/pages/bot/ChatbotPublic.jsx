/**
 * @fileoverview Página pública del chatbot educativo.
 *
 * Esta es la vista que ven los ESTUDIANTES cuando acceden al link generado
 * en el Paso 4 del wizard. NO requiere login.
 *
 * Ruta: /#/bot/:id
 *
 * Flujo de carga:
 *   1. Lee el :id del hash de la URL
 *   2. Busca el bot en Cosmos DB (getBotById)
 *   3. Si no lo encuentra (o no hay DB), muestra el bot en modo demo
 *      con la config guardada en localStorage como fallback
 *   4. Renderiza el chat en pantalla completa
 *
 * Diseño: pantalla completa optimizada para iframe y acceso directo.
 * No tiene sidebar, navbar ni ningún elemento de la app principal.
 */

import { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat.js';
import { getBotById } from '../../services/db.js';
import styles from './ChatbotPublic.module.css';

/* ── Indicador de escritura ─────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className={styles.typingRow}>
      <div className={styles.typingBubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}

/* ── Estado de error / bot no encontrado ────────────────────────────────── */
function BotNotFound({ id }) {
  return (
    <div className={styles.notFoundWrapper}>
      <div className={styles.notFoundCard}>
        <div className={styles.notFoundIcon}>🤖</div>
        <h2 className={styles.notFoundTitle}>Chatbot no encontrado</h2>
        <p className={styles.notFoundText}>
          No se encontró ningún chatbot con el identificador:
        </p>
        <code className={styles.notFoundId}>{id}</code>
        <p className={styles.notFoundHint}>
          Verifica que el enlace sea correcto o contacta al docente que lo creó.
        </p>
      </div>
    </div>
  );
}

/* ── Chat view ──────────────────────────────────────────────────────────── */
function ChatView({ config }) {
  const { messages, input, loading, bottomRef, setInput, sendMessage } = useChat(config);

  return (
    <div className={styles.chatWrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className={styles.headerInfo}>
          <p className={styles.botName}>{config.name || 'Asistente educativo'}</p>
          <p className={styles.botMeta}>{config.subject} · {config.level}</p>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          <span className={styles.statusLabel}>En línea</span>
        </div>
      </div>

      {/* Mensajes */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.messageRow} ${m.role === 'user' ? styles.messageRowUser : ''}`}
          >
            {m.role === 'bot' && (
              <div className={styles.botAvatarSmall}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            )}
            <div
              className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu pregunta aquí..."
          autoFocus
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Enviar mensaje"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Footer mínimo */}
      <div className={styles.footer}>
        Impulsado por <strong>ChatEdu Builder</strong> · IA educativa
      </div>
    </div>
  );
}

/* ── Skeleton de carga ──────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className={styles.skeletonWrapper}>
      <div className={styles.skeletonHeader} />
      <div className={styles.skeletonMessages}>
        <div className={`${styles.skeletonBubble} ${styles.skeletonBot}`} />
        <div className={`${styles.skeletonBubble} ${styles.skeletonUser}`} />
        <div className={`${styles.skeletonBubble} ${styles.skeletonBot}`} />
      </div>
      <div className={styles.skeletonInput} />
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */
/**
 * @param {Object} props
 * @param {string} props.botId - ID del bot extraído del hash de la URL.
 */
export default function ChatbotPublic({ botId }) {
  const [config, setConfig]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!botId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function loadBot() {
      setLoading(true);
      setNotFound(false);

      try {
        // Intento 1: buscar en Cosmos DB
        const bot = await getBotById(botId);
        if (bot) {
          setConfig(bot);
          setLoading(false);
          return;
        }
      } catch {
        // Cosmos DB no disponible → continuar al fallback
      }

      // Intento 2: fallback a localStorage
      // useBots guarda los bots en localStorage si Cosmos DB no está disponible.
      try {
        const cached = localStorage.getItem('chatedu_bots');
        if (cached) {
          const bots = JSON.parse(cached);
          const found = bots.find((b) => b.id === botId);
          if (found) {
            setConfig(found);
            setLoading(false);
            return;
          }
        }
      } catch {
        // localStorage inaccesible
      }

      // No encontrado en ninguna fuente
      setNotFound(true);
      setLoading(false);
    }

    loadBot();
  }, [botId]);

  if (loading)  return <LoadingSkeleton />;
  if (notFound) return <BotNotFound id={botId} />;
  return <ChatView config={config} />;
}
