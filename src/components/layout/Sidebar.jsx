/**
 * @fileoverview Barra de navegación lateral de la aplicación.
 * Componente presentacional puro: recibe la vista activa y un callback de cambio.
 * No contiene lógica de negocio.
 *
 * CAMBIOS (v0.3.6):
 * - El perfil de usuario ya no es hardcodeado ("Prof. Darío C.").
 *   Ahora consume el usuario autenticado desde AuthContext (nombre + email).
 * - Se añade botón de "Cerrar sesión" visible en el panel de usuario.
 *   Antes el logout no tenía entrada en la UI, lo que dejaba al docente
 *   atrapado en la sesión sin poder salir sin borrar localStorage manualmente.
 * - Las iniciales del avatar se generan dinámicamente desde el nombre del usuario.
 */

import styles from './Sidebar.module.css';
import { NAV_ITEMS } from '../../constants/index.js';
import { useAuth } from '../../auth/AuthContext.jsx';

/**
 * Genera las iniciales a mostrar en el avatar.
 * Toma la primera letra de cada palabra del nombre (máximo 2).
 * @param {string} name - Nombre completo del usuario.
 * @returns {string} Iniciales en mayúsculas, ej: "DC", "AM", "U".
 */
function getInitials(name = '') {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

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
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const displaySub  = user?.email || user?.role || '';
  const initials    = getInitials(displayName);

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

      {/* Perfil de usuario + logout */}
      <div className={styles.userSection}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{displayName}</p>
          <p className={styles.userInst}>{displaySub}</p>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
