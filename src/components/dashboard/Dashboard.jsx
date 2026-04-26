/**
 * @fileoverview Vista principal del Dashboard.
 */

import styles from './Dashboard.module.css';

/**
 * @param {Object} props
 * @param {Array<Object>} props.bots - Lista de chatbots a mostrar.
 * @param {(bot: Object) => void} props.onViewAnalytics - Navega a analítica del bot.
 * @param {() => void} props.onCreateBot - Navega al wizard de creación.
 * @param {(bot: Object) => void} props.onConfigureBot - Navega al wizard en modo edición.
 */
export default function Dashboard({ bots, onViewAnalytics, onCreateBot, onConfigureBot }) {
  const activeBots = bots.filter((b) => b.active).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis chatbots</h1>
          <p className={styles.subtitle}>{bots.length} chatbots · {activeBots} activos</p>
        </div>
        <button className={styles.createBtn} onClick={onCreateBot}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo chatbot
        </button>
      </div>

      <div className={styles.grid}>
        {bots.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            onViewAnalytics={() => onViewAnalytics(bot)}
            onConfigure={() => onConfigureBot(bot)}
          />
        ))}
      </div>
    </div>
  );
}

function BotCard({ bot, onViewAnalytics, onConfigure }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardColorBand} style={{ background: bot.color }} />
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.botName}>{bot.name}</p>
            <div className={styles.badges}>
              <span className={styles.badge}>{bot.subject}</span>
              <span className={styles.badge}>{bot.level}</span>
            </div>
          </div>
          <div className={`${styles.statusDot} ${bot.active ? styles.statusActive : styles.statusInactive}`} />
        </div>

        <div className={styles.metrics}>
          {[
            { value: bot.docs,    label: 'Documentos' },
            { value: bot.queries, label: 'Consultas'  },
          ].map(({ value, label }) => (
            <div key={label} className={styles.metric}>
              <p className={styles.metricValue}>{value}</p>
              <p className={styles.metricLabel}>{label}</p>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onViewAnalytics}>
            Ver analítica
          </button>
          <button className={styles.btnPrimary} onClick={onConfigure}>
            Configurar
          </button>
        </div>
      </div>
    </div>
  );
}
