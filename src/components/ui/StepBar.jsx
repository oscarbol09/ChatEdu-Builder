/**
 * @fileoverview Indicador de progreso del wizard de creación de chatbot.
 * Componente presentacional puro: solo recibe props, no gestiona estado propio.
 */

import styles from './StepBar.module.css';
import { BUILDER_STEPS } from '../../constants/index.js';

/**
 * @param {Object} props
 * @param {number} props.current - Índice del paso activo (0-based).
 */
export default function StepBar({ current }) {
  return (
    <div className={styles.wrapper}>
      {BUILDER_STEPS.map((label, i) => {
        const isDone   = i < current;
        const isActive = i === current;

        return (
          <div
            key={i}
            className={`${styles.stepContainer} ${i < BUILDER_STEPS.length - 1 ? styles.stepContainerFlex : ''}`}
          >
            {/* Círculo numerado + etiqueta */}
            <div className={styles.stepBody}>
              <div
                className={`${styles.circle} ${isDone ? styles.circleDone : ''} ${isActive ? styles.circleActive : ''}`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`${styles.label} ${isActive ? styles.labelActive : ''}`}
              >
                {label}
              </span>
            </div>

            {/* Línea conectora (no se muestra en el último paso) */}
            {i < BUILDER_STEPS.length - 1 && (
              <div className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
