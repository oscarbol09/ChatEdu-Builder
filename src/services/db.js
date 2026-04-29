/**
 * @fileoverview Capa de acceso a Azure Cosmos DB — cliente React/Vite.
 *
 * v2.1.0 — Fix dependencia circular (Paso 4).
 *
 * CAMBIO v2.1 vs v2.0:
 * getAccessToken() se movió a msalTokenHelper.js para romper el ciclo:
 *   db.js → AuthContext.jsx → db.js  (❌ circular, rompe tests en CI)
 *   db.js → msalTokenHelper.js       (✅ sin ciclo)
 *
 * Las firmas de todas las funciones exportadas son idénticas a v1.x.
 *
 * REGLA AGENT.md §3:
 * Este archivo sigue siendo el único punto de acceso a /api/bots y /api/users.
 */

import { getAccessToken } from './msalTokenHelper.js';

let currentUserEmail = null;

export function setCurrentUserEmail(email) {
  currentUserEmail = email;
}

// ─── Helper: fetch autenticado ────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const emailHeader = currentUserEmail ? { 'X-User-Email': currentUserEmail } : {};

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...emailHeader,
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

// ═══════════════════════════════════════════════════════
// Inicialización (no-op, conservada por compatibilidad)
// ═══════════════════════════════════════════════════════

export async function initDB() {
  return Promise.resolve();
}

// ═══════════════════════════════════════════════════════
// BOTS
// ═══════════════════════════════════════════════════════

export async function getBotsByUser(userId) {
  if (!userId) return [];
  try {
    return await apiFetch(`/api/bots?userId=${encodeURIComponent(userId)}`);
  } catch (err) {
    console.error('❌ getBotsByUser:', err.message);
    return [];
  }
}

export async function getPublicBots() {
  try {
    return await apiFetch('/api/bots?public=true');
  } catch (err) {
    console.error('❌ getPublicBots:', err.message);
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
  return apiFetch('/api/bots', { method: 'POST', body: JSON.stringify(bot) });
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

// ═══════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════

export async function createUser(userData) {
  return apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userData) });
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
  return (await getUserByEmail(email)) !== null;
}
