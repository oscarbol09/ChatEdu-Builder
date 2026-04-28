/**
 * @fileoverview Panel de publicación e integración del chatbot (Paso 4 del wizard).
 * Muestra URL directa, iframe embed y lista de LMS compatibles.
 *
 * CORRECCIÓN (v0.1.1) — URLs de despliegue reales:
 * La versión anterior generaba URLs con el dominio ficticio "chatedu.app".
 * Ahora la URL base se resuelve en este orden de prioridad:
 *   1. VITE_APP_URL definida en .env (dominio propio o Azure configurado)
 *   2. window.location.origin en runtime (funciona automáticamente en cualquier
 *      despliegue de Azure Static Web Apps sin configuración adicional)
 *
 * CORRECCIÓN (v0.3.2) — Config embebida en URL:
 * La versión anterior solo incluía el {id} del bot en la URL. Si Cosmos DB
 * no está disponible (secrets no configurados en GitHub Actions) y el
 * estudiante abre el enlace en una sesión nueva, localStorage está vacío
 * y el bot aparece como "no encontrado".
 *
 * Solución: la URL ahora incluye la configuración esencial del bot codificada
 * en Base64 como query param `?d=`. ChatbotPublic la lee como tercer fallback.
 * Orden de resolución en ChatbotPublic:
 *   1. Cosmos DB (si disponible)
 *   2. localStorage del docente (si misma sesión)
 *   3. Query param ?d= (siempre disponible, embebido en la URL)
 *
 * Ruta del bot: /#/bot/{id}?d={base64config}
 *   El hash (#) permite que Azure Static Web Apps sirva la ruta correctamente
 *   sin necesitar configuración de rewrite en staticwebapp.config.json.
 */

import { useState } from 'react';
import { APP_BASE_URL } from '../../constants/index.js';
import styles from './DeployPanel.module.css';

/** Plataformas LMS compatibles mostradas en el panel. */
const LMS_PLATFORMS = [
  'Moodle', 'Canvas', 'Blackboard', 'Google Classroom', 'Sitio web institucional',
];

/**
 * Genera el slug URL-seguro a partir del nombre del bot.
 * Elimina acentos, caracteres especiales y espacios.
 * @param {string} name
 * @returns {string}
 */
function toSlug(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')                    // separa letras de sus diacríticos
    .replace(/[\u0300-\u036f]/g, '')     // elimina los diacríticos (tildes, ñ→n, etc.)
    .replace(/[^a-z0-9\s-]/g, '')        // elimina caracteres especiales
    .trim()
    .replace(/\s+/g, '-');               // espacios → guiones
}

/**
 * Resuelve la URL base real de la aplicación.
 * En runtime, window.location.origin devuelve el dominio real donde está alojada la app.
 * @returns {string} URL base sin barra final, ej: "https://blue-moss-07818a11e7.azurestaticapps.net"
 */
function resolveBaseUrl() {
  // Prioridad 1: variable de entorno configurada explícitamente
  if (APP_BASE_URL) return APP_BASE_URL.replace(/\/$/, '');
  // Prioridad 2: dominio real en tiempo de ejecución (automático)
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/**
 * Codifica la configuración esencial del bot en Base64 para incrustarla en la URL.
 * Solo incluye los campos que ChatbotPublic necesita para renderizar el chat.
 * @param {Object} config
 * @returns {string} Base64 URL-safe
 */
function encodeConfig(config) {
  const payload = {
    name:        config.name        || '',
    subject:     config.subject     || '',
    level:       config.level       || '',
    tone:        config.tone        || '',
    welcome:     config.welcome     || '',
    restriction: config.restriction || 'guided',
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return '';
  }
}

/**
 * @param {Object} props
 * @param {Object} props.config   - Configuración activa del chatbot.
 * @param {string} props.config.name - Nombre del chatbot.
 * @param {string} [props.botId]  - ID real del bot (de Cosmos DB o useBots).
 *                                  Se usa como identificador único en la URL.
 */
export default function DeployPanel({ config, botId }) {
  const baseUrl = resolveBaseUrl();
  const slug    = toSlug(config.name) || 'mi-bot';

  // Configuración del bot embebida en Base64 como query param.
  // Esto garantiza que el chatbot funcione aunque Cosmos DB no esté disponible.
  const encodedConfig = encodeConfig(config);
  const configParam   = encodedConfig ? `?d=${encodedConfig}` : '';

  // Formato: {baseUrl}/#/bot/{botId o slug}?d={base64config}
  const botPath   = botId ? botId : slug;
  const directUrl = `${baseUrl}/#/bot/${botPath}${configParam}`;
  const embedCode = `<iframe src="${directUrl}" width="400" height="600" frameborder="0" title="${config.name || 'Chatbot educativo'}"></iframe>`;

  const [copied, setCopied] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Detectar si estamos en desarrollo local para mostrar aviso contextual
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className={styles.panel}>
      {/* Banner de éxito */}
      <div className={styles.successBanner}>
        <p className={styles.successTitle}>✓ Chatbot listo para publicar</p>
        <p className={styles.successText}>
          {config.name || 'Tu chatbot'} ha sido configurado. Elige cómo integrarlo.
        </p>
      </div>

      {/* Aviso contextual en desarrollo local */}
      {isLocalhost && (
        <div className={styles.localWarning}>
          <strong>Modo desarrollo:</strong> los enlaces de abajo apuntan a{' '}
          <code>localhost</code>. Para obtener los enlaces de producción, despliega
          la app en Azure Static Web Apps y vuelve a crear el bot desde allí,
          o define <code>VITE_APP_URL</code> en tu archivo <code>.env</code>.
        </div>
      )}

      {/* Campos de URL e iframe */}
      {[
        { label: 'URL directa',                    value: directUrl, key: 'url'   },
        { label: 'Código de incrustación (iframe)', value: embedCode, key: 'embed' },
      ].map(({ label, value, key }) => (
        <div key={key} className={styles.field}>
          <label className={styles.label}>{label}</label>
          <div className={styles.copyRow}>
            <input readOnly value={value} className={styles.codeInput} title={value} />
            <button
              onClick={() => handleCopy(value, key)}
              className={`${styles.copyBtn} ${copied === key ? styles.copyBtnDone : ''}`}
            >
              {copied === key ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
        </div>
      ))}

      {/* URL base resuelta — informativo para el docente */}
      <p className={styles.baseUrlNote}>
        Dominio detectado: <code>{baseUrl}</code>
      </p>

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
