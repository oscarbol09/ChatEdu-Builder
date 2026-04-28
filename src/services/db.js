/**
 * @fileoverview Capa de acceso a Azure Cosmos DB — cliente React/Vite.
 *
 * v2.0.0 — Paso 4: Añade el Bearer token de MSAL a todas las peticiones
 * autenticadas hacia el backend.
 *
 * CAMBIO RESPECTO A v1.x:
 * Las peticiones a /api/bots y /api/users ahora incluyen el header
 * Authorization: Bearer <access_token> obtenido de MSAL de forma silenciosa.
 *
 * Si MSAL no está configurado (modo demo), las peticiones se envían sin token
 * y el middleware requireAuth del backend las acepta en entorno local
 * (NODE_ENV=development) o las rechaza en producción.
 *
 * Las firmas de todas las funciones exportadas son idénticas a v1.x.
 *
 * REGLA AGENT.md §3:
 * Este archivo sigue siendo el único punto de acceso a /api/bots y /api/users.
 */

import { msalInstance } from '../auth/AuthContext.jsx';

// ─── Scopes de acceso a la API ────────────────────────────────────────────────

// Para llamadas al propio backend de SWA / Azure Functions:
// El scope estándar para APIs protegidas con la misma aplicación Entra ID es
// `api://<client-id>/<scope>`. Si no tienes scopes de API definidos,
// usa el scope de Graph para autenticar la identidad del usuario.
const API_SCOPES = import.meta.env.VITE_ENTRA_CLIENT_ID
  ? [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/user_impersonation`]
  : [];

// ─── Helper: obtener access token silenciosamente ─────────────────────────────

/**
 * Obtiene el access token de MSAL de forma silenciosa para la cuenta activa.
 * Devuelve null si MSAL no está configurado o si no hay cuenta activa.
 *
 * @returns {Promise<string|null>}
 */
async function getAccessToken() {
  if (!msalInstance) return null;

  const account = msalInstance.getActiveAccount()
    ?? msalInstance.getAllAccounts()[0]
    ?? null;

  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes:  API_SCOPES.length > 0 ? API_SCOPES : ['openid', 'profile'],
      account,
    });
    return result.accessToken ?? null;
  } catch {
    // Si el silent falla (token expirado, interacción requerida), devolver null.
    // El backend responderá 401 y el usuario deberá re-autenticarse.
    return null;
  }
}

// ─── Helper: fetch autenticado ────────────────────────────────────────────────

/**
 * Envuelve fetch con manejo de errores HTTP uniforme e inyección del token MSAL.
 *
 * @param {string}      url
 * @param {RequestInit} [options]
 * @returns {Promise<any>} JSON parseado de la respuesta.
 */
async function apiFetch(url, options = {}) {
  const token = await getAccessToken();

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, {
    headers: {
      'Content-Type':  'application/json',
      ...authHeader,
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `Error HTTP ${res.status} en ${url}`);
  }

  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
// Inicialización (mantenida por compatibilidad con useBots.js)
// ═════════════════════════════════════════════════════════════════════════════

export async function initDB() {
  return Promise.resolve();
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN BOTS
// ═════════════════════════════════════════════════════════════════════════════

export async function getBotsByUser(userId) {
  if (!userId) return [];
  try {
    // El backend extrae el userId del token; el query param es ignorado
    // en el backend con auth, pero lo conservamos para compatibilidad
    // con el modo demo (backend sin auth).
    return await apiFetch(`/api/bots?userId=${encodeURIComponent(userId)}`);
  } catch (err) {
    console.error('❌ getBotsByUser:', err.message);
    return [];
  }
}

export async function getBots() {
  try {
    return await apiFetch('/api/bots');
  } catch (err) {
    console.error('❌ getBots:', err.message);
    return [];
  }
}

export async function createBot(bot) {
  return apiFetch('/api/bots', {
    method: 'POST',
    body:   JSON.stringify(bot),
  });
}

export async function updateBot(id, updates) {
  return apiFetch(`/api/bots/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body:   JSON.stringify(updates),
  });
}

export async function deleteBot(id) {
  await apiFetch(`/api/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

export async function getBotById(id) {
  try {
    return await apiFetch(`/api/bots/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('no encontrado')) return null;
    console.error('❌ getBotById:', err.message);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN USUARIOS
// ═════════════════════════════════════════════════════════════════════════════

export async function createUser(userData) {
  return apiFetch('/api/users', {
    method: 'POST',
    body:   JSON.stringify(userData),
  });
}

export async function getUserByEmail(email) {
  if (!email) return null;
  try {
    return await apiFetch(`/api/users/${encodeURIComponent(email)}`);
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('no encontrado')) return null;
    console.warn('⚠️ getUserByEmail:', err.message);
    return null;
  }
}

export async function userExists(email) {
  const user = await getUserByEmail(email);
  return user !== null;
}
