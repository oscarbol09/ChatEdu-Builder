/**
 * @fileoverview Singleton del cliente Azure Cosmos DB para el backend.
 *
 * Las credenciales se leen desde variables de entorno del servidor
 * (Application Settings en Azure, local.settings.json en local).
 * NUNCA se exponen al bundle del cliente React/Vite.
 *
 * Soporta Variables con o sin prefijo VITE_ (Azure Static Web Apps).
 *
 * En producción, reemplazar COSMOS_KEY por Managed Identity:
 *   new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() })
 * y eliminar COSMOS_KEY de Application Settings.
 */

import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID     = process.env.COSMOS_DATABASE_ID     || 'chatedu';
const CONTAINER_BOTS  = process.env.COSMOS_BOTS_CONTAINER  || 'bots';
const CONTAINER_USERS = process.env.COSMOS_USERS_CONTAINER || 'users';

let _client         = null;
let _botsContainer  = null;
let _usersContainer = null;

/**
 * Lee variable de entorno con soporte para prefijo VITE_
 */
function getEnvVar(name) {
  return process.env[name] || process.env[`VITE_${name}`];
}

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

  const endpoint = getEnvVar('COSMOS_ENDPOINT');
  const key      = getEnvVar('COSMOS_KEY');

  if (!endpoint || !key) {
    throw new Error(
      'COSMOS_ENDPOINT o COSMOS_KEY no están definidas en Application Settings. ' +
      'En producción, agrégalas en Azure Static Web App → Variables de entorno.'
    );
  }

  _client         = new CosmosClient({ endpoint, key });
  const db        = _client.database(DATABASE_ID);
  _botsContainer  = db.container(CONTAINER_BOTS);
  _usersContainer = db.container(CONTAINER_USERS);

  return { botsContainer: _botsContainer, usersContainer: _usersContainer };
}
