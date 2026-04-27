/**
 * @fileoverview Capa de acceso a Azure Blob Storage.
 *
 * ADVERTENCIA DE SEGURIDAD:
 * Esta implementación usa la connection string completa desde variables de
 * entorno VITE_*, lo que la expone en el bundle del navegador.
 * Esto es aceptable SOLO para desarrollo local.
 *
 * En producción: mover toda esta lógica a una Azure Function con
 * Managed Identity, y que el cliente solo llame a /api/documents/*.
 *
 * CAMBIO DE SEGURIDAD (v0.1.1):
 * Se eliminó `publicAccessLevel: 'blob'` al crear el contenedor.
 * Los documentos de los estudiantes son privados por defecto.
 * El acceso se gestiona a través de SAS tokens generados en servidor
 * (a implementar en la migración a Azure Functions).
 */

import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = import.meta.env.VITE_STORAGE_CONNECTION_STRING;
const containerName = 'documents';

/**
 * Inicializa el cliente de Blob Storage de forma lazy para evitar
 * errores si la connection string no está definida en el entorno actual.
 */
function getClients() {
  if (!connectionString) {
    throw new Error(
      'VITE_STORAGE_CONNECTION_STRING no está definida. ' +
      'Agrega esta variable al archivo .env del proyecto.'
    );
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  return { blobServiceClient, containerClient };
}

/**
 * Verifica que el contenedor existe. Lo crea sin acceso público si no existe.
 * El acceso a blobs individuales se gestiona mediante SAS tokens.
 */
export async function initStorage() {
  try {
    const { blobServiceClient, containerClient } = getClients();
    await containerClient.getProperties();
    console.log('✅ Storage conectado');
  } catch (error) {
    if (error.statusCode === 404) {
      const { blobServiceClient } = getClients();
      // Sin publicAccessLevel → acceso privado por defecto (seguro)
      await blobServiceClient.createContainer(containerName);
      console.log('📦 Contenedor de documentos creado (acceso privado)');
    } else if (error.message?.includes('VITE_STORAGE_CONNECTION_STRING')) {
      console.warn('⚠️ Storage no disponible:', error.message);
    } else {
      console.error('❌ Error de Storage:', error.message);
    }
  }
}

/**
 * Sube un archivo al contenedor del bot indicado.
 * @param {string} botId - ID del bot propietario del documento.
 * @param {File} file - Archivo a subir.
 * @returns {Promise<Object>} Metadatos del blob creado.
 */
export async function uploadDocument(botId, file) {
  try {
    const { containerClient } = getClients();
    const blobName = `${botId}/${Date.now()}_${file.name}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadBrowserData(file);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      // Nota: la URL directa del blob no es accesible públicamente.
      // En producción, generar un SAS token de corta duración desde el servidor.
      blobName,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error subiendo documento:', error.message);
    throw error;
  }
}

/**
 * Elimina un documento del Storage.
 * @param {string} botId - ID del bot propietario.
 * @param {string} fileName - Nombre del archivo (sin el prefijo botId/).
 */
export async function deleteDocument(botId, fileName) {
  try {
    const { containerClient } = getClients();
    const blobName = `${botId}/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error('❌ Error eliminando documento:', error.message);
    throw error;
  }
}

/**
 * Lista los documentos asociados a un bot.
 * @param {string} botId - ID del bot.
 * @returns {Promise<Array>} Lista de metadatos de blobs.
 */
export async function listDocuments(botId) {
  try {
    const { containerClient } = getClients();
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${botId}/` })) {
      if (blob.properties.lastModified) {
        blobs.push({
          name: blob.name.split('/')[1],
          size: blob.properties.contentLength,
          blobName: blob.name,
          uploadedAt: blob.properties.lastModified.toISOString(),
        });
      }
    }
    return blobs;
  } catch (error) {
    console.error('❌ Error listando documentos:', error.message);
    return [];
  }
}
