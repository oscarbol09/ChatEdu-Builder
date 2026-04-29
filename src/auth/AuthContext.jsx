/**
 * @fileoverview Contexto de autenticación — Microsoft Entra ID vía MSAL (Paso 4).
 *
 * v2.0.0 — Migración completa de stub demo a @azure/msal-react + @azure/msal-browser.
 *
 * INTERFAZ PÚBLICA SIN CAMBIOS:
 *   { user, isAuthenticated, isAuthLoading, login, register, logout }
 *
 * Esta interfaz es idéntica a v1.x para que App.jsx, Login.jsx y
 * cualquier consumidor de useAuth() no requieran modificación.
 *
 * ESTRATEGIA DE AUTENTICACIÓN:
 *   - login()    → MSAL loginPopup() (flujo interactivo OAuth2/OIDC).
 *   - logout()   → MSAL logoutPopup().
 *   - register() → no existe en Entra ID (el admin provee cuentas).
 *                  Se conserva la firma pero lanza el error canónico de
 *                  restricción de rol, redirigiendo al admin.
 *   - user       → perfil extraído del ID token de MSAL.
 *   - isAuthLoading → true mientras MSAL resuelve la sesión SSO silenciosa
 *                     (equivalente a inProgress !== InteractionStatus.None).
 *
 * CONFIGURACIÓN:
 *   Las variables de entorno necesarias son:
 *     VITE_ENTRA_CLIENT_ID   → Application (client) ID del registro en Azure AD
 *     VITE_ENTRA_TENANT_ID   → Directory (tenant) ID
 *     VITE_ENTRA_REDIRECT_URI → URI de redirección registrada (ej: http://localhost:5173)
 *
 *   En producción, añadir estas tres variables a Application Settings de
 *   Azure Static Web Apps (NO son secretos: son públicas en el flujo OAuth2).
 *
 * FALLBACK DE DESARROLLO:
 *   Si VITE_ENTRA_CLIENT_ID no está definida (desarrollo sin Azure AD),
 *   el contexto cae al modo stub demo con admin/admin para no bloquear
 *   el trabajo local. El modo demo se indica en consola con un warning.
 *
 * REGLA AGENT.md §9:
 *   isAuthLoading sigue existiendo y el guard en App.jsx sigue siendo válido.
 *   No eliminar ni bypassear.
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import {
  PublicClientApplication,
  InteractionStatus,
  EventType,
} from '@azure/msal-browser';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { getUserByEmail, createUser } from '../services/db.js';
import { msalRef } from '../services/msalTokenHelper.js';
import { setCurrentUserEmail } from '../services/db.js';

// ═════════════════════════════════════════════════════════════════════════════
// Constantes de rol (sin cambios respecto a v1.x)
// ═════════════════════════════════════════════════════════════════════════════

const RESTRICTED_ROLES = new Set(['docente', 'profesor']);

export const ROLE_RESTRICTION_MSG =
  'La creación de cuentas para Docentes/Profesores está restringida. ' +
  'Por favor, comuníquese con el administrador del sistema para solicitar su acceso.';

// ═════════════════════════════════════════════════════════════════════════════
// Configuración MSAL
// ═════════════════════════════════════════════════════════════════════════════

const ENTRA_CLIENT_ID   = import.meta.env.VITE_ENTRA_CLIENT_ID;
const ENTRA_TENANT_ID   = import.meta.env.VITE_ENTRA_TENANT_ID   ?? 'common';
const ENTRA_REDIRECT_URI = import.meta.env.VITE_ENTRA_REDIRECT_URI ?? window.location.origin;

/** true cuando las variables de entorno de Entra ID están configuradas. */
const MSAL_ENABLED = Boolean(ENTRA_CLIENT_ID);

/**
 * Instancia singleton de PublicClientApplication.
 * Se crea una sola vez fuera del ciclo de render para evitar múltiples
 * instancias que causarían errores de "interaction_in_progress".
 */
export let msalInstance = null;

/**
 * Promesa que resuelve cuando msalInstance está lista para usarse.
 * @azure/msal-browser v3+ requiere llamar a initialize() antes de cualquier
 * operación. Sin esto, accounts llega como objeto interno (no array) y
 * provoca "e.filter is not a function" en el bundle minificado.
 */
export let msalInitPromise = Promise.resolve();

if (MSAL_ENABLED) {
  msalInstance = new PublicClientApplication({
    auth: {
      clientId:    ENTRA_CLIENT_ID,
      authority:   `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
      redirectUri: ENTRA_REDIRECT_URI,
    },
    cache: {
      cacheLocation:         'sessionStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          if (level === 0) console.error('[MSAL]', message);
          if (level === 1) console.warn('[MSAL]', message);
        },
      },
    },
  });
  // initialize() procesa el hash de redirección OAuth2 y prepara el caché
  // interno. MsalProvider lo requiere antes de montar el árbol de React.
  msalInitPromise = msalInstance.initialize().then(() => {
    // Exponer la instancia inicializada al helper de token.
    // Se hace aquí (post-initialize) para garantizar que el helper
    // nunca use la instancia antes de que MSAL haya procesado el
    // hash de redirección OAuth2.
    msalRef.instance = msalInstance;
  });
} else {
  console.warn(
    '[AuthContext] VITE_ENTRA_CLIENT_ID no está definida. ' +
    'Usando modo stub demo (admin/admin). ' +
    'Configura las variables VITE_ENTRA_* en .env para usar Entra ID.'
  );
}

/** Scopes mínimos para leer el perfil del usuario. */
const LOGIN_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

// ═════════════════════════════════════════════════════════════════════════════
// Contexto React
// ═════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext(null);

// ═════════════════════════════════════════════════════════════════════════════
// Modo STUB DEMO (fallback cuando MSAL no está configurado)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Proveedor de autenticación en modo demo (sin Entra ID).
 * Conserva el comportamiento de v1.x para no bloquear desarrollo local.
 * Se activa automáticamente cuando VITE_ENTRA_CLIENT_ID no está definida.
 */
function AuthProviderStub({ children }) {
  const [user,          setUser]          = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('chatedu_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem('chatedu_user');
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const _persist = (u) => {
    setUser(u);
    sessionStorage.setItem('chatedu_user', JSON.stringify(u));
  };

  const login = useCallback(async ({ email, password, role }) => {
    if (!email) throw new Error('Ingrese un correo electrónico.');
    // Bypass admin/admin en modo demo
    if (
      import.meta.env.VITE_ENABLE_TEST_ADMIN === 'true' &&
      email.trim().toLowerCase() === 'admin' &&
      password === 'admin'
    ) {
      _persist({ id: 'admin', email: 'admin', name: 'Administrador', role: 'docente' });
      return;
    }
    const dbUser = await getUserByEmail(email).catch(() => null);
    _persist(dbUser ?? { email, role, name: email.split('@')[0] });
  }, []);

  const register = useCallback(async ({ email, name, role }) => {
    if (RESTRICTED_ROLES.has(role?.toLowerCase())) throw new Error(ROLE_RESTRICTION_MSG);
    if (!email) throw new Error('Ingrese un correo electrónico.');
    const existing = await getUserByEmail(email).catch(() => null);
    if (existing) throw new Error('Ya existe una cuenta con este correo electrónico.');
    const newUser = {
      id: email, email,
      name: (name || '').trim() || email.split('@')[0],
      role, createdAt: new Date().toISOString(),
    };
    await createUser(newUser).catch((e) => console.warn('⚠️ createUser (demo):', e.message));
    _persist(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('chatedu_user');
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isAuthLoading, login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Modo MSAL (Entra ID real)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Proveedor interno que usa los hooks de @azure/msal-react.
 * Debe estar envuelto en <MsalProvider> (ver AuthProvider abajo).
 */
function AuthProviderMsalInner({ children }) {
  const { instance, accounts, inProgress } = useMsal();

  const [user,    setUser]    = useState(null);
  const [dbReady, setDbReady] = useState(false);

  /**
   * isAuthLoading:
   *   true  → MSAL todavía está procesando una interacción (login/logout/SSO silencioso).
   *   false → MSAL está inactivo; podemos leer accounts[] con confianza.
   *
   * Esto es el equivalente Entra ID del isAuthLoading de v1.x (AGENT.md §9).
   */
  const isAuthLoading = inProgress !== InteractionStatus.None || !dbReady;

  /**
   * Cuando MSAL resuelve la cuenta activa, construye el perfil de usuario
   * sincronizando con Cosmos DB (crea el usuario si es la primera vez).
   */
  useEffect(() => {
    const activeAccount = accounts[0] ?? null;

    if (!activeAccount) {
      setUser(null);
      setDbReady(true);
      return;
    }

    (async () => {
      try {
        const email = activeAccount.username; // UPN del token
        const name  = activeAccount.name ?? activeAccount.username;

        // Verificar/crear usuario en Cosmos DB la primera vez.
        let dbUser = await getUserByEmail(email).catch(() => null);
        if (!dbUser) {
          dbUser = {
            id: email, email, name,
            // El rol por defecto para cuentas Entra ID es 'docente';
            // el admin puede cambiarlo directamente en Cosmos DB.
            role: 'docente',
            createdAt: new Date().toISOString(),
          };
          await createUser(dbUser).catch((e) =>
            console.warn('[AuthContext] No se pudo crear usuario en BD:', e.message)
          );
        }

        setUser({
          id:    dbUser.id    ?? email,
          email: dbUser.email ?? email,
          name:  dbUser.name  ?? name,
          role:  dbUser.role  ?? 'docente',
        });
      } catch (err) {
        console.error('[AuthContext] Error resolviendo perfil de usuario:', err.message);
        // Fallback: perfil mínimo desde el token para no bloquear la app.
        setUser({
          id:    activeAccount.username,
          email: activeAccount.username,
          name:  activeAccount.name ?? activeAccount.username,
          role:  'docente',
        });
      } finally {
        setDbReady(true);
      }
    })();
  }, [accounts]);

  /**
   * Suscribirse al evento LOGIN_SUCCESS para actualizar la cuenta activa
   * después de un loginPopup exitoso.
   */
  useEffect(() => {
    const callbackId = instance.addEventCallback((event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        event.payload?.account
      ) {
        instance.setActiveAccount(event.payload.account);
      }
    });
    return () => {
      if (callbackId) instance.removeEventCallback(callbackId);
    };
  }, [instance]);

/**
 * login() — abre el popup de Microsoft para autenticación interactiva.
 * La firma es idéntica a v1.x para no romper Login.jsx.
 * Si provider='microsoft', usa MSAL. Si no, usa autenticación por BD (estudiantes/externos).
 */
const login = useCallback(async (authData = {}) => {
  // Si provider es 'microsoft', usar MSAL
  if (authData.provider === 'microsoft') {
    try {
      await instance.loginPopup({
        scopes:  LOGIN_SCOPES,
        prompt:  'select_account',
      });
    } catch (err) {
      if (err.errorCode !== 'user_cancelled') throw err;
    }
    return;
  }

  // Autenticación por BD (estudiantes/externos)
  const { email, role, password } = authData;
  const userRecord = await getUserByEmail(email);
  if (!userRecord) {
    throw new Error('Credenciales inválidas.');
  }
  if (userRecord.password !== password) {
    throw new Error('Credenciales inválidas.');
  }
  if (userRecord.role !== role) {
    throw new Error(`Esta cuenta está registrada como ${userRecord.role}.`);
  }
  setCurrentUserEmail(userRecord.email);
  setUser({
    email:    userRecord.email,
    name:     userRecord.name,
    role:     userRecord.role,
    provider: 'email',
  });
  setDbReady(true);
}, [instance]);

/**
 * register() — registro de estudiantes/externos en la BD local.
 * Docentes no pueden registrarse (solo inicio via Microsoft).
 */
const register = useCallback(async ({ email, name, role, password }) => {
  if (RESTRICTED_ROLES.has(role?.toLowerCase())) {
    throw new Error(ROLE_RESTRICTION_MSG);
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error('Ya existe una cuenta con este correo.');
  }
  const userPassword = password || Math.random().toString(36).slice(-8);
  const newUser = await createUser({ email, name, role, password: userPassword });
  setCurrentUserEmail(newUser.email);
  setUser({
    email:    newUser.email,
    name:     newUser.name,
    role:     newUser.role,
    provider: 'email',
  });
  setDbReady(true);
}, []);

  /**
   * logout() — cierra la sesión en MSAL y en Azure AD.
   */
  const logout = useCallback(async () => {
    const activeAccount = instance.getActiveAccount() ?? accounts[0];
    try {
      await instance.logoutPopup({ account: activeAccount });
    } catch (err) {
      // Si el popup falla, limpiar el estado local igualmente.
      console.warn('[AuthContext] logoutPopup falló, limpiando estado local:', err.message);
    }
    setCurrentUserEmail(null);
    setUser(null);
    setDbReady(false);
  }, [instance, accounts]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAuthLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AuthProvider público (selector automático MSAL vs. stub)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Envuelve la app con el proveedor correcto según el entorno:
 *   - MSAL_ENABLED (VITE_ENTRA_CLIENT_ID definida) → MsalProvider + AuthProviderMsalInner
 *   - Sin configuración Entra ID                   → AuthProviderStub (modo demo)
 *
 * App.jsx no necesita cambios: sigue usando <AuthProvider>.
 */
export function AuthProvider({ children }) {
  if (!MSAL_ENABLED) {
    return <AuthProviderStub>{children}</AuthProviderStub>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderMsalInner>{children}</AuthProviderMsalInner>
    </MsalProvider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Hook de consumo
// ═════════════════════════════════════════════════════════════════════════════

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return ctx;
}
