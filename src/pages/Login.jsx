/**
 * @fileoverview Pantalla de inicio de sesión y registro.
 *
 * Modos:
 *   'login'    — Inicia sesión con email, contraseña y rol.
 *   'register' — Crea una cuenta nueva. Bloquea el rol 'docente'.
 *
 * CAMBIOS (v0.3.0):
 * - Se añade campo de contraseña al modo login. Necesario para que el usuario
 *   admin/admin (TEST_ADMIN en AuthContext) pueda autenticarse correctamente.
 *   En modo demo (BD no disponible) la contraseña no se valida para cuentas
 *   regulares, solo para admin.
 *
 * CAMBIOS (v0.2.0):
 * - Separación en dos modos con tabs: Iniciar sesión / Crear cuenta.
 * - El rol 'Docente / Profesor' en modo registro muestra el aviso de restricción.
 * - Campos añadidos al registro: Nombre (opcional).
 * - Manejo de estado `loading` para bloquear doble envío.
 *
 * NOTA DE PRODUCCIÓN:
 * Reemplazar por Microsoft Entra ID (@azure/msal-react).
 * La interfaz de AuthContext (login, register) no cambia, solo la presentación.
 */

import { useState } from 'react';
import { useAuth, ROLE_RESTRICTION_MSG } from '../auth/AuthContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { login, register } = useAuth();

  /** 'login' | 'register' */
  const [mode,     setMode]     = useState('login');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('estudiante');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  /** En modo registro y con rol restringido mostramos el aviso, no el error genérico. */
  const isRestrictedRole = mode === 'register' && role === 'docente';

  const switchMode = (newMode) => {
    setMode(newMode);
    setErr('');
    setRole('estudiante');
    setPassword('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isRestrictedRole) return;

    setErr('');
    if (!email.trim()) {
      setErr('Ingrese un correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ email: email.trim(), name: name.trim(), role });
      } else {
        await login({ email: email.trim(), role, password });
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = loading
    ? 'Procesando...'
    : mode === 'register'
    ? 'Crear cuenta'
    : 'Entrar';

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>

        {/* ── Logo / Título ── */}
        <h2 className={styles.title}>ChatEdu Builder</h2>
        <p className={styles.subtitle}>Plataforma de chatbots educativos</p>

        {/* ── Tabs de modo ── */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        {/* ── Error genérico ── */}
        {err && !isRestrictedRole && (
          <p className={styles.error}>{err}</p>
        )}

        {/* ── Correo ── */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            type={mode === 'login' ? 'text' : 'email'}
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder={mode === 'login' ? 'usuario@ejemplo.com o admin' : 'usuario@ejemplo.com'}
            required
          />
        </div>

        {/* ── Contraseña (solo en login) ── */}
        {mode === 'login' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
        )}

        {/* ── Nombre (solo en registro) ── */}
        {mode === 'register' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Nombre <span className={styles.optional}>(opcional)</span>
            </label>
            <input
              id="name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Tu nombre completo"
            />
          </div>
        )}

        {/* ── Rol ── */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role">
            Rol
          </label>
          <select
            id="role"
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente / Profesor</option>
          </select>
        </div>

        {/* ── Aviso de restricción para docentes ── */}
        {isRestrictedRole && (
          <div className={styles.notice} role="alert">
            <svg
              className={styles.noticeIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className={styles.noticeText}>{ROLE_RESTRICTION_MSG}</p>
          </div>
        )}

        {/* ── Botón de acción ── */}
        <button
          type="submit"
          className={styles.btn}
          disabled={loading || isRestrictedRole}
        >
          {submitLabel}
        </button>

        {/* ── Nota demo ── */}
        <p className={styles.disclaimer}>
          {mode === 'login'
            ? 'Demo: usa admin / admin para acceso de testeo. En producción se usará autenticación institucional.'
            : 'Las cuentas de Estudiante se guardan en Azure Cosmos DB.'}
        </p>
      </form>
    </div>
  );
}
