/**
 * @fileoverview Singleton del cliente Azure Blob Storage para el backend.
 *
 * La connection string se lee desde variables de entorno del servidor.
 * En producción, migrar a Managed Identity:
 *   new BlobServiceClient(`https://${account}.blob.core.windows.net`, new DefaultAzureCredential())
 * y eliminar STORAGE_CONNECTION_STRING de Application Settings.
 */

import { BlobServiceClient } from '@azure/storage-blob';

export const CONTAINER_NAME = 'documents';

let _blobServiceClient = null;
let _containerClient   = null;

/**
 * Devuelve el BlobServiceClient y el ContainerClient, inicializándolos
 * la primera vez (patrón singleton).
 *
 * @returns {{ blobServiceClient: BlobServiceClient, containerClient: import('@azure/storage-blob').ContainerClient }}
 * @throws {Error} Si STORAGE_CONNECTION_STRING no está definida.
 */
export function getStorageClients() {
  if (_containerClient) {
    return { blobServiceClient: _blobServiceClient, containerClient: _containerClient };
  }

  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      'STORAGE_CONNECTION_STRING no está definida en Application Settings. ' +
      'En desarrollo local, agrégala a api/local.settings.json.'
    );
  }

  _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  _containerClient   = _blobServiceClient.getContainerClient(CONTAINER_NAME);

  return { blobServiceClient: _blobServiceClient, containerClient: _containerClient };
}
