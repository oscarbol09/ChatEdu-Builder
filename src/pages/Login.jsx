/**
 * @fileoverview Pantalla de inicio de sesión y registro.
 *
 * v2.0.0 — Paso 4: Integración con Microsoft Entra ID (MSAL).
 *
 * MODOS DE RENDERIZADO:
 *   A) MSAL habilitado (VITE_ENTRA_CLIENT_ID definida):
 *      Muestra dos opciones:
 *        - Botón Microsoft (solo docentes - inicio de sesión)
 *        - Formulario email/contraseña (estudiantes/externos - registro y login)
 *
 *   B) MSAL no configurado (entorno de desarrollo sin Azure AD):
 *      Muestra el formulario demo original (email + contraseña + rol).
 *      El comportamiento es idéntico a v1.x para no bloquear el desarrollo.
 *
 * La distinción entre modos A y B es transparente para AuthContext:
 * ambos llaman a login() con la misma firma.
 *
 * REGLA AGENT.md §3:
 * Login.jsx no llama a fetch() directamente. Delega toda autenticación
 * a useAuth() → AuthContext → MSAL / stub.
 */

import { useState } from 'react';
import { useAuth, ROLE_RESTRICTION_MSG } from '../auth/AuthContext.jsx';
import styles from './Login.module.css';

/** Detectar si MSAL está configurado para elegir el modo de UI. */
const MSAL_ENABLED = Boolean(import.meta.env.VITE_ENTRA_CLIENT_ID);

// ─── Modo A: Microsoft + Email (cuando Entra ID está configurado) ───────────

function LoginMsal() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

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

  return (
    <div className={styles.wrapper}>
      <div className={styles.form}>
        <h2 className={styles.title}>ChatEdu Builder</h2>
        <p className={styles.subtitle}>Plataforma de chatbots educativos</p>

        {!showEmailForm ? (
          <>
            {err && <p className={styles.error}>{err}</p>}

            <button
              type="button"
              className={styles.btn}
              onClick={handleMicrosoftLogin}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
            >
              {!loading && (
                <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
                  <rect x="1"  y="1"  width="10" height="10" fill="#f25022" />
                  <rect x="12" y="1"  width="10" height="10" fill="#7fba00" />
                  <rect x="1"  y="12" width="10" height="10" fill="#00a4ef" />
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                </svg>
              )}
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión con Microsoft'}
            </button>

            <p className={styles.disclaimer}>
              Para docentes: accede con tu cuenta institucional de Microsoft.
            </p>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setShowEmailForm(true)}
            >
              ¿Eres estudiante o externo? Crea una cuenta
            </button>
          </>
        ) : (
          <LoginEmailForm />
        )}
      </div>
    </div>
  );
}

// ─── Formulario de Email/Contraseña (para estudiantes/externos) ─────────────

function LoginEmailForm() {
  const { login, register } = useAuth();

  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('estudiante');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setErr('');
    setPassword('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email.trim()) { setErr('Ingrese un correo electrónico.'); return; }
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

  return (
    <div>
      <button
        type="button"
        className={styles.linkBack}
        onClick={() => setMode('login')}
        style={{ display: mode === 'register' ? 'block' : 'none', marginBottom: '1rem' }}
      >
        ← Volver
      </button>

      <form onSubmit={onSubmit} noValidate>
        {err && <p className={styles.error}>{err}</p>}

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
          <>
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
              <label className={styles.label} htmlFor="role">Rol</label>
              <select id="role" className={styles.input} value={role}
                onChange={(e) => setRole(e.target.value)}>
                <option value="estudiante">Estudiante</option>
                <option value="externo">Externo</option>
              </select>
            </div>
          </>
        )}

        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? 'Procesando...' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
        </button>

        <p className={styles.toggleMode}>
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => switchMode('register')}>
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => switchMode('login')}>
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

// ─── Modo B: Formulario demo (sin Entra ID configurado) ───────────────────

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
        await login({ email: email.trim(), role, password });
      }
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="role">Rol</label>
          <select id="role" className={styles.input} value={role}
            onChange={(e) => setRole(e.target.value)}>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente / Profesor</option>
          </select>
        </div>

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
          {loading ? 'Procesando...' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
        </button>

        <p className={styles.disclaimer}>
          {mode === 'login'
            ? 'Demo: usa admin / admin para acceso de testeo. Configura VITE_ENTRA_CLIENT_ID para Entra ID.'
            : 'Las cuentas de Estudiante se guardan en Azure Cosmos DB.'}
        </p>
      </form>
    </div>
  );
}

// ─── Exportación principal: selector automático ───────────────────────────

export default function Login() {
  return MSAL_ENABLED ? <LoginMsal /> : <LoginDemo />;
}
