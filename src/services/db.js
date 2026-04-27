/**
 * @fileoverview Capa de acceso a Azure Cosmos DB.
 *
 * ADVERTENCIA DE SEGURIDAD:
 * Esta implementación usa la clave primaria desde variables de entorno VITE_*,
 * lo que la expone en el bundle del navegador.
 * Esto es aceptable SOLO para desarrollo local.
 *
 * En producción: mover toda esta lógica a Azure Functions con
 * Managed Identity + Key Vault, y que el cliente solo llame a /api/bots/*.
 *
 * CORRECCIONES (v0.1.1):
 * - Inicialización lazy del cliente (evita errores con .env vacío).
 * - Sintaxis correcta de containers.create() en Cosmos DB SDK v4.
 * - updateBot() ahora usa correctamente el parámetro `id`.
 * - Eliminados los exports de objetos internos (encapsulamiento).
 */

import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID = 'chatedu';
const CONTAINER_BOTS = 'bots';

/** Cliente y referencias inicializados de forma lazy al primer uso. */
let _client = null;
let _botsContainer = null;

/**
 * Inicializa el cliente de Cosmos DB la primera vez que se llama.
 * Lanza un error descriptivo si las variables de entorno no están definidas.
 * @returns {{ client: CosmosClient, botsContainer: Container }}
 */
function getCosmosClient() {
  if (_client) return { client: _client, botsContainer: _botsContainer };

  const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT;
  const key = import.meta.env.VITE_COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error(
      'VITE_COSMOS_ENDPOINT o VITE_COSMOS_KEY no están definidas. ' +
      'Agrega estas variables al archivo .env del proyecto.'
    );
  }

  _client = new CosmosClient({ endpoint, key });
  _botsContainer = _client.database(DATABASE_ID).container(CONTAINER_BOTS);

  return { client: _client, botsContainer: _botsContainer };
}

/**
 * Verifica la conexión y crea el contenedor 'bots' si no existe.
 * Debe llamarse una vez al arrancar la app (en useBots.js).
 */
export async function initDB() {
  try {
    const { client } = getCosmosClient();
    const database = client.database(DATABASE_ID);
    const { resources } = await database.containers.readAll().fetchAll();
    const containerExists = resources.some((c) => c.id === CONTAINER_BOTS);

    if (!containerExists) {
      // Sintaxis correcta del SDK v4: body y options son argumentos separados.
      await database.containers.create(
        { id: CONTAINER_BOTS, partitionKey: { paths: ['/id'] } }
      );
      console.log('📦 Contenedor "bots" creado');
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

/**
 * Devuelve todos los bots del contenedor.
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
 * Crea un nuevo bot.
 * @param {Object} bot - Objeto bot con todos sus campos (incluye id).
 * @returns {Promise<Object>} Recurso creado por Cosmos DB.
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
 * @param {string} id - ID del bot a actualizar.
 * @param {Object} updates - Objeto con los campos actualizados (debe incluir `id`).
 * @returns {Promise<Object>} Recurso actualizado.
 */
export async function updateBot(id, updates) {
  try {
    const { botsContainer } = getCosmosClient();
    // Garantizamos que el objeto enviado a upsert siempre lleva el id correcto.
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
 * @param {string} id - ID del bot a eliminar.
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
 * @param {string} id - ID del bot.
 * @returns {Promise<Object|null>}
 */
export async function getBotById(id) {
  try {
    const { botsContainer } = getCosmosClient();
    const { resource } = await botsContainer.item(id, id).read();
    return resource;
  } catch (error) {
    console.error('❌ Error obteniendo bot por ID:', error.message);
    return null;
  }
}
