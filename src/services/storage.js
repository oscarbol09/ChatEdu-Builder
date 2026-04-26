import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = import.meta.env.VITE_STORAGE_CONNECTION_STRING;
const containerName = 'documents';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export async function initStorage() {
  try {
    await containerClient.getProperties();
    console.log('✅ Storage conectado');
  } catch (error) {
    if (error.statusCode === 404) {
      await blobServiceClient.createContainer(containerName, { publicAccessLevel: 'blob' });
      console.log('📦 Contenedor de documentos creado');
    } else {
      console.error('❌ Error de Storage:', error.message);
    }
  }
}

export async function uploadDocument(botId, file) {
  try {
    const blobName = `${botId}/${Date.now()}_${file.name}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadBrowserData(file);
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url: blockBlobClient.url,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error subiendo documento:', error.message);
    throw error;
  }
}

export async function deleteDocument(botId, fileName) {
  try {
    const blobName = `${botId}/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error('❌ Error eliminando documento:', error.message);
    throw error;
  }
}

export async function listDocuments(botId) {
  try {
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${botId}/` })) {
      if (blob.properties.lastModified) {
        blobs.push({
          name: blob.name.split('/')[1],
          size: blob.properties.contentLength,
          url: containerClient.getBlockBlobClient(blob.name).url,
          uploadedAt: blob.properties.lastModified.toISOString()
        });
      }
    }
    return blobs;
  } catch (error) {
    console.error('❌ Error listando documentos:', error.message);
    return [];
  }
}

export { blobServiceClient, containerClient };