/**
 * @fileoverview Formulario de configuración del chatbot (Paso 2 del wizard).
 * Componente controlado: recibe config y onChange. No gestiona estado propio.
 */

import styles from './BotConfigForm.module.css';
import { BOT_SUBJECTS, BOT_LEVELS, BOT_TONES, RESTRICTION_OPTIONS } from '../../constants/index.js';

/**
 * @param {Object} props
 * @param {Object} props.config - Estado actual del formulario de configuración.
 * @param {(updatedConfig: Object) => void} props.onChange - Callback al modificar cualquier campo.
 */
export default function BotConfigForm({ config, onChange }) {
  /** Actualiza un campo manteniendo el resto del objeto intacto. */
  const update = (field, value) => onChange({ ...config, [field]: value });

  return (
    <div className={styles.form}>
      {/* Fila 1: Nombre + Asignatura */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Nombre del chatbot</label>
          <input
            value={config.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ej: Tutor de Cálculo I"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Área / Asignatura</label>
          <select
            value={config.subject}
            onChange={(e) => update('subject', e.target.value)}
            className={styles.select}
          >
            {BOT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Fila 2: Nivel + Tono */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Nivel educativo</label>
          <select
            value={config.level}
            onChange={(e) => update('level', e.target.value)}
            className={styles.select}
          >
            {BOT_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Tono del chatbot</label>
          <select
            value={config.tone}
            onChange={(e) => update('tone', e.target.value)}
            className={styles.select}
          >
            {BOT_TONES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Mensaje de bienvenida */}
      <div className={styles.field}>
        <label className={styles.label}>Mensaje de bienvenida</label>
        <textarea
          value={config.welcome}
          onChange={(e) => update('welcome', e.target.value)}
          rows={3}
          placeholder="Ej: ¡Hola! Soy tu asistente de Cálculo. ¿Qué quieres aprender hoy?"
          className={styles.textarea}
        />
      </div>

      {/* Restricciones temáticas */}
      <div className={styles.field}>
        <label className={styles.label}>Restricciones temáticas</label>
        <div className={styles.radioGroup}>
          {RESTRICTION_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={`${styles.radioOption} ${config.restriction === value ? styles.radioOptionSelected : ''}`}
            >
              <input
                type="radio"
                value={value}
                checked={config.restriction === value}
                onChange={() => update('restriction', value)}
                className={styles.radioInput}
              />
              <span className={styles.radioLabel}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
