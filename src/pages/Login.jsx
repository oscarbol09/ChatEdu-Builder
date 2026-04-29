/**
 * @fileoverview Pantalla de inicio de sesión y registro.
 *
 * v3.0.0 — Unified Login:
 *   - Formulario unificado de Email + Contraseña para todos los roles
 *   - Botón de Microsoft como opción alternativa
 *   - Redirección por rol (docente → dashboard, estudiante → vista de chat)
 *
 * REGLA AGENT.md §3:
 * Login.jsx no llama a fetch() directamente. Delega toda autenticación
 * a useAuth() → AuthContext → MSAL / stub.
 */

import { useState } from 'react';
import { useAuth, ROLE_RESTRICTION_MSG } from '../auth/AuthContext.jsx';
import { navigateTo } from '../router/useHashRoute.js';
import styles from './Login.module.css';

/** Detectar si MSAL está configurado. */
const MSAL_ENABLED = Boolean(import.meta.env.VITE_ENTRA_CLIENT_ID);

// ─── Login Unificado ─────────────────────────────────────────────────────────

function UnifiedLogin() {
  const { login, register } = useAuth();

  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('estudiante');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleMicrosoftLogin = async () => {
    setErr('');
    setLoading(true);
    try {
      await login({ provider: 'microsoft' });
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErr('');
    setPassword('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email.trim()) { setErr('Ingrese un correo electrónico.'); return; }
    if (mode === 'register' && !password) { setErr('Ingrese una contraseña.'); return; }
    setLoading(true);
    try {
      let user;
      if (mode === 'register') {
        user = await register({ email: email.trim(), name: name.trim(), role, password });
      } else {
        user = await login({ email: email.trim(), password });
      }
      // Redirección por rol después del login/registro exitoso
      if (user?.role === 'docente') {
        navigateTo('/');
      } else {
        navigateTo('/');
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.form}>
        <h2 className={styles.title}>ChatEdu Builder</h2>
        <p className={styles.subtitle}>Plataforma de chatbots educativos</p>

        {err && <p className={styles.error}>{err}</p>}

        {mode === 'login' ? (
          <>
            <form onSubmit={onSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Correo electrónico</label>
                <input id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="tu@email.com"
                  required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Contraseña</label>
                <input id="password" type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required />
              </div>

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>

            <p className={styles.toggleMode}>
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => switchMode('register')}>
                Regístrate aquí
              </button>
            </p>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <button
              type="button"
              className={styles.btnMicrosoft}
              onClick={handleMicrosoftLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
                <rect x="1"  y="1"  width="10" height="10" fill="#f25022" />
                <rect x="12" y="1"  width="10" height="10" fill="#7fba00" />
                <rect x="1"  y="12" width="10" height="10" fill="#00a4ef" />
                <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
              </svg>
              Institucional (Microsoft)
            </button>

            <p className={styles.disclaimer}>
              Acceso rápido para docentes con cuenta institucional
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.linkBack}
              onClick={() => switchMode('login')}
            >
              ← Volver al inicio de sesión
            </button>

            <form onSubmit={onSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Correo electrónico</label>
                <input id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="tu@email.com"
                  required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">Nombre</label>
                <input id="name" type="text"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Tu nombre completo" />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Contraseña</label>
                <input id="password" type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="role">Rol</label>
                <select id="role" className={styles.input} value={role}
                  onChange={(e) => setRole(e.target.value)}>
                  <option value="estudiante">Estudiante</option>
                  <option value="externo">Externo</option>
                </select>
              </div>

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>

            <p className={styles.disclaimer}>
              Los docentes deben ser creados por un administrador.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modo Demo (sin Entra ID) ───────────────────────────────────────────────

function LoginDemo() {
  const { login, register } = useAuth();

  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('estudiante');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

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
    if (!email.trim()) { setErr('Ingrese un correo electrónico.'); return; }
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ email: email.trim(), name: name.trim(), role });
      } else {
        await login({ email: email.trim(), password });
      }
      navigateTo('/');
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>

        <h2 className={styles.title}>ChatEdu Builder</h2>
        <p className={styles.subtitle}>Plataforma de chatbots educativos</p>

        <div className={styles.tabs}>
          <button type="button"
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}>
            Iniciar sesión
          </button>
          <button type="button"
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}>
            Crear cuenta
          </button>
        </div>

        {err && !isRestrictedRole && <p className={styles.error}>{err}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Correo electrónico</label>
          <input id="email"
            type={mode === 'login' ? 'text' : 'email'}
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder={mode === 'login' ? 'usuario@ejemplo.com o admin' : 'usuario@ejemplo.com'}
            required />
        </div>

        {mode === 'login' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Contraseña</label>
            <input id="password" type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••" />
          </div>
        )}

        {mode === 'register' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Nombre <span className={styles.optional}>(opcional)</span>
            </label>
            <input id="name" type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Tu nombre completo" />
          </div>
        )}

        {mode === 'register' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="role">Rol</label>
            <select id="role" className={styles.input} value={role}
              onChange={(e) => setRole(e.target.value)}>
              <option value="estudiante">Estudiante</option>
              <option value="docente">Docente / Profesor</option>
            </select>
          </div>
        )}

        {isRestrictedRole && (
          <div className={styles.notice} role="alert">
            <svg className={styles.noticeIcon} width="18" height="18"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className={styles.noticeText}>{ROLE_RESTRICTION_MSG}</p>
          </div>
        )}

        <button type="submit" className={styles.btn}
          disabled={loading || isRestrictedRole}>
          {loading ? 'Procesando...' : mode === 'register' ? 'Crear cuenta' : 'Iniciar Sesión'}
        </button>

        <p className={styles.disclaimer}>
          {mode === 'login'
            ? 'Demo: usa admin / admin para acceso de testeo.'
            : 'Las cuentas se guardan en Azure Cosmos DB.'}
        </p>
      </form>
    </div>
  );
}

// ─── Exportación principal ─────────────────────────────────────────────────

export default function Login() {
  return MSAL_ENABLED ? <UnifiedLogin /> : <LoginDemo />;
}