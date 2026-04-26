/**
 * @fileoverview Barra de navegación lateral de la aplicación.
 * Componente presentacional puro: recibe la vista activa y un callback de cambio.
 * No contiene lógica de negocio.
 */

import styles from './Sidebar.module.css';
import { NAV_ITEMS } from '../../constants/index.js';

/**
 * Íconos SVG indexados por clave de vista.
 * Para añadir una nueva vista: registrar su ícono aquí con la clave correspondiente.
 * @type {Object.<string, JSX.Element>}
 */
const NAV_ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  builder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
};

/**
 * @param {Object} props
 * @param {'dashboard'|'builder'|'analytics'} props.activeView - Vista actualmente activa.
 * @param {(view: string) => void} props.onNavigate - Callback al hacer clic en un ítem de nav.
 */
export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo y nombre del producto */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className={styles.brandName}>ChatEdu</p>
          <p className={styles.brandSub}>Builder</p>
        </div>
      </div>

      {/* Ítems de navegación */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.navItem} ${activeView === key ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(key)}
          >
            {NAV_ICONS[key]}
            {label}
          </button>
        ))}
      </nav>

      {/* Perfil de usuario */}
      <div className={styles.userSection}>
        <div className={styles.avatar}>DC</div>
        <div>
          <p className={styles.userName}>Prof. Darío C.</p>
          <p className={styles.userInst}>Institución educativa</p>
        </div>
      </div>
    </aside>
  );
}
