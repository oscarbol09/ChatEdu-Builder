/**
 * @fileoverview Panel de publicación e integración del chatbot (Paso 4 del wizard).
 * Muestra URL directa, iframe embed y lista de LMS compatibles.
 */

import { useState } from 'react';
import styles from './DeployPanel.module.css';

/** Plataformas LMS compatibles mostradas en el panel. */
const LMS_PLATFORMS = [
  'Moodle', 'Canvas', 'Blackboard', 'Google Classroom', 'Sitio web institucional',
];

/**
 * @param {Object} props
 * @param {Object} props.config - Configuración activa del chatbot.
 * @param {string} props.config.name - Nombre del chatbot (usado para generar el slug de URL).
 */
export default function DeployPanel({ config }) {
  const slug = config.name?.replace(/\s/g, '-').toLowerCase() || 'mi-bot';
  const directUrl = `https://chatedu.app/bot/${slug}`;
  const embedCode = `<iframe src="${directUrl}" width="400" height="600" frameborder="0"></iframe>`;

  const [copied, setCopied] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={styles.panel}>
      {/* Banner de éxito */}
      <div className={styles.successBanner}>
        <p className={styles.successTitle}>✓ Chatbot listo para publicar</p>
        <p className={styles.successText}>
          {config.name || 'Tu chatbot'} ha sido configurado. Elige cómo integrarlo.
        </p>
      </div>

      {/* Campos de URL e iframe */}
      {[
        { label: 'URL directa',                      value: directUrl,  key: 'url'   },
        { label: 'Código de incrustación (iframe)',   value: embedCode,  key: 'embed' },
      ].map(({ label, value, key }) => (
        <div key={key} className={styles.field}>
          <label className={styles.label}>{label}</label>
          <div className={styles.copyRow}>
            <input readOnly value={value} className={styles.codeInput} />
            <button
              onClick={() => handleCopy(value, key)}
              className={`${styles.copyBtn} ${copied === key ? styles.copyBtnDone : ''}`}
            >
              {copied === key ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
        </div>
      ))}

      {/* LMS compatibles */}
      <div className={styles.lmsBlock}>
        <p className={styles.lmsTitle}>Compatible con plataformas LMS</p>
        <div className={styles.lmsTags}>
          {LMS_PLATFORMS.map((p) => (
            <span key={p} className={styles.lmsTag}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
