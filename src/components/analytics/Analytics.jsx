/**
 * @fileoverview Vista de analítica de uso por chatbot.
 * Muestra KPIs, gráfico de barras semanal y lagunas conceptuales detectadas.
 */

import styles from './Analytics.module.css';
import { ANALYTICS } from '../../data/mockData.js';

/**
 * @param {Object} props
 * @param {Object} props.bot - Bot seleccionado desde el dashboard.
 * @param {() => void} props.onBack - Callback para volver al dashboard.
 */
export default function Analytics({ bot, onBack }) {
  const bars = ANALYTICS.weekly;
  const max = Math.max(...bars);
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className={styles.wrapper}>
      {/* Botón de retorno */}
      <button onClick={onBack} className={styles.backBtn}>← Volver</button>

      {/* Cabecera */}
      <div className={styles.header}>
        <h1 className={styles.title}>{bot.name}</h1>
        <p className={styles.subtitle}>Analítica de uso · últimos 7 días</p>
      </div>

      <div className={styles.card}>
        {/* KPIs */}
        <div className={styles.kpis}>
          {[
            { label: 'Consultas totales', value: bot.queries },
            { label: 'Documentos base',   value: bot.docs     },
            { label: 'Sesión promedio',   value: '4.2 min'    },
          ].map(({ label, value }) => (
            <div key={label} className={styles.kpi}>
              <p className={styles.kpiLabel}>{label}</p>
              <p className={styles.kpiValue}>{value}</p>
            </div>
          ))}
        </div>

        {/* Gráfico semanal */}
        <div className={styles.chartSection}>
          <p className={styles.sectionTitle}>Consultas últimos 7 días</p>
          <div className={styles.chart}>
            {bars.map((v, i) => (
              <div key={i} className={styles.barCol}>
                {/* Altura dinámica: único uso permitido de style inline (AGENT.md §2) */}
                <div
                  className={`${styles.bar} ${i === 6 ? styles.barActive : ''}`}
                  style={{ height: `${(v / max) * 60}px` }}
                />
                <span className={styles.dayLabel}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lagunas conceptuales */}
        <div className={styles.gapsSection}>
          <p className={styles.sectionTitle}>Lagunas conceptuales detectadas</p>
          {ANALYTICS.gaps.map((g) => (
            <div key={g} className={styles.gapItem}>
              <span className={styles.gapDot} />
              <span className={styles.gapText}>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
