/**
 * @fileoverview Singleton del cliente Azure Cosmos DB para el backend.
 *
 * Las credenciales se leen desde variables de entorno del servidor
 * (Application Settings en Azure, local.settings.json en local).
 * NUNCA se exponen al bundle del cliente React/Vite.
 *
 * En producción, reemplazar COSMOS_KEY por Managed Identity:
 *   new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() })
 * y eliminar COSMOS_KEY de Application Settings.
 */

import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID     = 'chatedu';
const CONTAINER_BOTS  = 'bots';
const CONTAINER_USERS = 'users';

let _client         = null;
let _botsContainer  = null;
let _usersContainer = null;

/**
 * Devuelve las referencias a los contenedores, inicializando el cliente
 * la primera vez (patrón singleton).
 *
 * @returns {{ botsContainer: import('@azure/cosmos').Container, usersContainer: import('@azure/cosmos').Container }}
 * @throws {Error} Si COSMOS_ENDPOINT o COSMOS_KEY no están definidas.
 */
export function getCosmosClient() {
  if (_client) {
    return { botsContainer: _botsContainer, usersContainer: _usersContainer };
  }

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key      = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error(
      'COSMOS_ENDPOINT o COSMOS_KEY no están definidas en Application Settings. ' +
      'En desarrollo local, agrégalas a api/local.settings.json.'
    );
  }

  _client         = new CosmosClient({ endpoint, key });
  const db        = _client.database(DATABASE_ID);
  _botsContainer  = db.container(CONTAINER_BOTS);
  _usersContainer = db.container(CONTAINER_USERS);

  return { botsContainer: _botsContainer, usersContainer: _usersContainer };
}
