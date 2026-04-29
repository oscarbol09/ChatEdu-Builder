/**
 * @fileoverview Helper de acceso al token MSAL para peticiones autenticadas.
 *
 * PASO 4 — Extraído de db.js para romper la dependencia circular:
 *   db.js → AuthContext.jsx → db.js  (❌ circular)
 *   db.js → msalTokenHelper.js       (✅ sin ciclo)
 *
 * AuthContext.jsx importa de db.js (getUserByEmail, createUser).
 * db.js necesita msalInstance para obtener el Bearer token.
 * La solución es que db.js importe la instancia MSAL desde aquí,
 * no desde AuthContext.jsx.
 *
 * IMPORTANTE: msalInstance se asigna DESPUÉS del módulo principal
 * porque PublicClientApplication se inicializa en AuthContext.jsx.
 * Usamos un objeto contenedor para que la referencia sea mutable.
 */

/** @type {{ instance: import('@azure/msal-browser').PublicClientApplication | null }} */
export const msalRef = { instance: null };

const API_SCOPES = import.meta.env.VITE_ENTRA_CLIENT_ID
  ? [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/user_impersonation`]
  : [];

/**
 * Obtiene el access token de MSAL de forma silenciosa.
 * Devuelve null si MSAL no está configurado o si no hay sesión activa.
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const msal = msalRef.instance;
  if (!msal) return null;

  const account = msal.getActiveAccount()
    ?? msal.getAllAccounts()[0]
    ?? null;

  if (!account) return null;

  try {
    const result = await msal.acquireTokenSilent({
      scopes:  API_SCOPES.length > 0 ? API_SCOPES : ['openid', 'profile'],
      account,
    });
    return result.accessToken ?? null;
  } catch {
    return null;
  }
}
