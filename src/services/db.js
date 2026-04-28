/**
 * @fileoverview Capa de acceso a Azure Cosmos DB — cliente React/Vite.
 *
 * v1.0.0 — Migración a Azure Functions proxy (Paso 1 de seguridad).
 *
 * CAMBIO DE ARQUITECTURA:
 * Esta capa ya NO usa el SDK @azure/cosmos ni credenciales VITE_*.
 * Todas las operaciones se delegan a la Azure Function App en /api/bots
 * y /api/users, que gestiona las credenciales de forma segura en el servidor.
 *
 * Las firmas de todas las funciones exportadas son idénticas a la versión
 * anterior para que ningún hook ni componente requiera modificación.
 *
 * En desarrollo local, Vite redirige /api → http://localhost:7071
 * mediante el proxy configurado en vite.config.js.
 */

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Envuelve fetch con manejo de errores HTTP uniforme.
 * Lanza un Error con el mensaje del servidor si el status no es 2xx.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>} JSON parseado de la respuesta.
 */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 204) return null; // No content (DELETE exitoso)

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `Error HTTP ${res.status} en ${url}`);
  }

  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
// Inicialización (mantenida por compatibilidad con useBots.js)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * En la versión original inicializaba Cosmos DB.
 * Con el proxy, la Function App gestiona la conexión.
 * Esta función se conserva para no romper el hook useBots.js.
 * @returns {Promise<void>}
 */
export async function initDB() {
  // No-op: la Function App gestiona la conexión al servidor.
  // Se mantiene la firma para compatibilidad con useBots.js.
  return Promise.resolve();
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN BOTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve todos los bots del usuario.
 * @param {string} userId - Email del propietario.
 * @returns {Promise<Array>}
 */
export async function getBotsByUser(userId) {
  if (!userId) return [];
  try {
    return await apiFetch(`/api/bots?userId=${encodeURIComponent(userId)}`);
  } catch (err) {
    console.error('❌ getBotsByUser:', err.message);
    return [];
  }
}

/**
 * Devuelve todos los bots (uso interno / admin).
 * @returns {Promise<Array>}
 */
export async function getBots() {
  try {
    // Sin userId devuelve todos — solo para uso administrativo.
    return await apiFetch('/api/bots');
  } catch (err) {
    console.error('❌ getBots:', err.message);
    return [];
  }
}

/**
 * Crea un nuevo bot.
 * @param {Object} bot
 * @returns {Promise<Object>}
 */
export async function createBot(bot) {
  return apiFetch('/api/bots', {
    method: 'POST',
    body:   JSON.stringify(bot),
  });
}

/**
 * Actualiza (upsert) un bot existente.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateBot(id, updates) {
  return apiFetch(`/api/bots/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body:   JSON.stringify(updates),
  });
}

/**
 * Elimina un bot por su ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteBot(id) {
  await apiFetch(`/api/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

/**
 * Obtiene un bot por su ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
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

/**
 * Crea un nuevo usuario.
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export async function createUser(userData) {
  return apiFetch('/api/users', {
    method: 'POST',
    body:   JSON.stringify(userData),
  });
}

/**
 * Busca un usuario por email.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
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

/**
 * Verifica si ya existe un usuario con el email dado.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function userExists(email) {
  const user = await getUserByEmail(email);
  return user !== null;
}
