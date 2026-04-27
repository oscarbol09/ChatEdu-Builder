/**
 * @fileoverview Capa de acceso a Azure Cosmos DB.
 *
 * ADVERTENCIA DE SEGURIDAD:
 * Esta implementación usa la clave primaria desde variables de entorno VITE_*,
 * lo que la expone en el bundle del navegador.
 * Esto es aceptable SOLO para desarrollo local.
 *
 * En producción: mover toda esta lógica a Azure Functions con
 * Managed Identity + Key Vault, y que el cliente solo llame a /api/*.
 *
 * CAMBIOS (v0.2.0):
 * - Se añade el contenedor 'users' para persistencia de usuarios.
 * - getUserByEmail() usa el email como id del documento → lookup O(1).
 * - Se añade createUser(), userExists().
 * - Se añade getBotsByUser(userId) para filtrar bots por propietario.
 * - getBots() se mantiene por compatibilidad (uso interno/admin).
 * - NOTA DE ARQUITECTURA: el contenedor 'bots' usa partitionKey '/id'.
 *   Las consultas por userId son cross-partition. Para producción a escala,
 *   recrear el contenedor con partitionKey '/userId'.
 */

import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID    = 'chatedu';
const CONTAINER_BOTS  = 'bots';
const CONTAINER_USERS = 'users';

/** Referencias lazy — se inicializan en la primera llamada a getCosmosClient(). */
let _client         = null;
let _botsContainer  = null;
let _usersContainer = null;

// ─── Inicialización del cliente ───────────────────────────────────────────────

/**
 * Inicializa el cliente y las referencias a contenedores la primera vez.
 * No hace llamadas de red; solo construye los objetos del SDK.
 * @returns {{ client, botsContainer, usersContainer }}
 * @throws {Error} Si las variables de entorno no están definidas.
 */
function getCosmosClient() {
  if (_client) return { client: _client, botsContainer: _botsContainer, usersContainer: _usersContainer };

  const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT;
  const key      = import.meta.env.VITE_COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error(
      'VITE_COSMOS_ENDPOINT o VITE_COSMOS_KEY no están definidas. ' +
      'Agrega estas variables al archivo .env del proyecto.'
    );
  }

  _client         = new CosmosClient({ endpoint, key });
  const db        = _client.database(DATABASE_ID);
  _botsContainer  = db.container(CONTAINER_BOTS);
  _usersContainer = db.container(CONTAINER_USERS);

  return { client: _client, botsContainer: _botsContainer, usersContainer: _usersContainer };
}

// ─── Inicialización de la base de datos ──────────────────────────────────────

/**
 * Verifica la conexión y crea los contenedores 'bots' y 'users' si no existen.
 * Debe llamarse una vez al arrancar la app (en useBots.js).
 */
export async function initDB() {
  try {
    const { client } = getCosmosClient();
    const database   = client.database(DATABASE_ID);

    const { resources } = await database.containers.readAll().fetchAll();
    const existing = new Set(resources.map((c) => c.id));

    if (!existing.has(CONTAINER_BOTS)) {
      await database.containers.create({
        id: CONTAINER_BOTS,
        partitionKey: { paths: ['/id'] },
      });
      console.log('📦 Contenedor "bots" creado');
    }

    if (!existing.has(CONTAINER_USERS)) {
      // id === email → partition key coincide con el campo de búsqueda principal.
      await database.containers.create({
        id: CONTAINER_USERS,
        partitionKey: { paths: ['/id'] },
      });
      console.log('📦 Contenedor "users" creado');
    }

    console.log('✅ Base de datos conectada');
  } catch (error) {
    if (error.message?.includes('VITE_COSMOS')) {
      console.warn('⚠️ Cosmos DB no disponible:', error.message);
    } else {
      console.error('❌ Error de conexión a Cosmos DB:', error.message);
    }
    throw error;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN BOTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve todos los bots del contenedor (sin filtro de usuario).
 * Uso interno / panel de administración.
 * @returns {Promise<Array>}
 */
export async function getBots() {
  try {
    const { botsContainer } = getCosmosClient();
    const { resources } = await botsContainer.items.readAll().fetchAll();
    return resources;
  } catch (error) {
    console.error('❌ Error obteniendo bots:', error.message);
    return [];
  }
}

/**
 * Devuelve únicamente los bots que pertenecen a un usuario, ordenados por fecha.
 * Realiza una consulta cross-partition sobre el campo `userId`.
 * @param {string} userId - Email del usuario propietario (campo `userId` en el documento).
 * @returns {Promise<Array>}
 */
export async function getBotsByUser(userId) {
  if (!userId) return [];
  try {
    const { botsContainer } = getCosmosClient();
    const querySpec = {
      query:      'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    };
    const { resources } = await botsContainer.items
      .query(querySpec, { enableCrossPartitionQuery: true })
      .fetchAll();
    return resources;
  } catch (error) {
    console.error('❌ Error obteniendo bots del usuario:', error.message);
    return [];
  }
}

/**
 * Crea un nuevo bot en Cosmos DB.
 * El objeto debe incluir `id` (partition key) y `userId` (email del propietario).
 * @param {Object} bot
 * @returns {Promise<Object>} Recurso creado.
 */
export async function createBot(bot) {
  try {
    const { botsContainer } = getCosmosClient();
    const { resource } = await botsContainer.items.create(bot);
    return resource;
  } catch (error) {
    console.error('❌ Error creando bot:', error.message);
    throw error;
  }
}

/**
 * Actualiza (upsert) un bot existente.
 * @param {string} id - ID del bot.
 * @param {Object} updates - Campos actualizados. Debe incluir `id` y `userId`.
 * @returns {Promise<Object>}
 */
export async function updateBot(id, updates) {
  try {
    const { botsContainer } = getCosmosClient();
    const payload = { ...updates, id };
    const { resource } = await botsContainer.items.upsert(payload);
    return resource;
  } catch (error) {
    console.error('❌ Error actualizando bot:', error.message);
    throw error;
  }
}

/**
 * Elimina un bot por su ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteBot(id) {
  try {
    const { botsContainer } = getCosmosClient();
    await botsContainer.item(id, id).delete();
    return true;
  } catch (error) {
    console.error('❌ Error eliminando bot:', error.message);
    throw error;
  }
}

/**
 * Obtiene un bot por su ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getBotById(id) {
  try {
    const { botsContainer } = getCosmosClient();
    const { resource } = await botsContainer.item(id, id).read();
    return resource ?? null;
  } catch (error) {
    if (error.code === 404 || error.statusCode === 404) return null;
    console.error('❌ Error obteniendo bot por ID:', error.message);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN USUARIOS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Crea un nuevo usuario en Cosmos DB.
 *
 * Esquema del documento (id === email para lookup O(1) por partition key):
 * {
 *   id:        string   // === email
 *   email:     string
 *   name:      string
 *   role:      'estudiante' | 'docente'
 *   createdAt: string   // ISO 8601
 * }
 *
 * REGLA DE ROL: la validación de rol (bloqueo de docentes) se realiza en
 * AuthContext.jsx ANTES de llamar a esta función. Esta función no valida roles.
 *
 * @param {Object} userData - Debe incluir { id, email, name, role, createdAt }.
 * @returns {Promise<Object>} Recurso creado.
 * @throws {Error} Si el usuario ya existe (409) o hay error de red.
 */
export async function createUser(userData) {
  try {
    const { usersContainer } = getCosmosClient();
    const { resource } = await usersContainer.items.create(userData);
    return resource;
  } catch (error) {
    console.error('❌ Error creando usuario:', error.message);
    throw error;
  }
}

/**
 * Busca un usuario por email. Usa el email como id del documento → O(1) sin cross-partition.
 * @param {string} email
 * @returns {Promise<Object|null>} Documento del usuario, o null si no existe.
 */
export async function getUserByEmail(email) {
  if (!email) return null;
  try {
    const { usersContainer } = getCosmosClient();
    const { resource } = await usersContainer.item(email, email).read();
    return resource ?? null;
  } catch (error) {
    if (error.code === 404 || error.statusCode === 404) return null;
    if (error.message?.includes('VITE_COSMOS')) return null;
    console.warn('⚠️ Error buscando usuario:', error.message);
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
