import { CosmosClient } from '@azure/cosmos';

const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT;
const key = import.meta.env.VITE_COSMOS_KEY;
const databaseId = 'chatedu';
const containerBots = 'bots';

const client = new CosmosClient({ endpoint, key });

export async function initDB() {
  try {
    const { database } = await client.databases(databaseId).read();
    console.log('✅ Base de datos conectada');
    
    try {
      await database.containers(containerBots).read();
      console.log('✅ Contenedor "bots" conectado');
    } catch (e) {
      if (e.code === 404) {
        await database.containers.create(containerBots, { id: containerBots, partitionKey: { paths: ['/id'] } });
        console.log('📦 Contenedor "bots" creado');
      }
    }
  } catch (error) {
    if (error.code === 404) {
      const { database } = await client.databases.create({ id: databaseId });
      console.log('📦 Base de datos "chatedu" creada');
      
      await database.containers.create(containerBots, { id: containerBots, partitionKey: { paths: ['/id'] } });
      console.log('📦 Contenedor "bots" creado');
    } else {
      console.error('❌ Error de conexión:', error.message);
    }
  }
}

const database = client.database(databaseId);
const botsContainer = database.container(containerBots);

export async function getBots() {
  try {
    const { resources } = await botsContainer.items.readAll().fetchAll();
    return resources;
  } catch (error) {
    console.error('❌ Error obteniendo bots:', error.message);
    return [];
  }
}

export async function createBot(bot) {
  try {
    const { resource } = await botsContainer.items.create(bot);
    return resource;
  } catch (error) {
    console.error('❌ Error creando bot:', error.message);
    throw error;
  }
}

export async function updateBot(id, updates) {
  try {
    const { resource } = await botsContainer.items.upsert(updates);
    return resource;
  } catch (error) {
    console.error('❌ Error actualizando bot:', error.message);
    throw error;
  }
}

export async function deleteBot(id) {
  try {
    await botsContainer.item(id, id).delete();
    return true;
  } catch (error) {
    console.error('❌ Error eliminando bot:', error.message);
    throw error;
  }
}

export async function getBotById(id) {
  try {
    const { resource } = await botsContainer.item(id, id).read();
    return resource;
  } catch (error) {
    console.error('❌ Error obteniendo bot:', error.message);
    return null;
  }
}

export { client, database, botsContainer };