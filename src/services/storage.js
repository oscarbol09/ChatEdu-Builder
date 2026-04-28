/**
 * @fileoverview Capa de acceso a Azure Blob Storage — cliente React/Vite.
 *
 * v1.0.0 — Migración a Azure Functions proxy (Paso 1 de seguridad).
 *
 * CAMBIO DE ARQUITECTURA:
 * Esta capa ya NO usa el SDK @azure/storage-blob ni VITE_STORAGE_CONNECTION_STRING.
 * Todas las operaciones se delegan a /api/documents en la Azure Function App.
 *
 * Las firmas de las funciones exportadas son idénticas a la versión anterior
 * para no romper los componentes que las consumen (UploadZone, etc.).
 *
 * En desarrollo local, Vite redirige /api → http://localhost:7071.
 */

// ─── Inicialización (mantenida por compatibilidad) ─────────────────────────────

/**
 * En la versión original verificaba/creaba el contenedor de Blob Storage.
 * Con el proxy, la Function App gestiona el contenedor.
 * @returns {Promise<void>}
 */
export async function initStorage() {
  // No-op: la Function App crea el contenedor en el primer upload si no existe.
  return Promise.resolve();
}

// ─── uploadDocument ────────────────────────────────────────────────────────────

/**
 * Sube un archivo al contenedor del bot indicado vía Azure Function.
 *
 * @param {string} botId - ID del bot propietario del documento.
 * @param {File}   file  - Archivo a subir (objeto File del navegador).
 * @returns {Promise<Object>} Metadatos del blob: { name, size, type, blobName, uploadedAt }
 */
export async function uploadDocument(botId, file) {
  const formData = new FormData();
  formData.append('botId', botId);
  formData.append('file',  file);

  const res = await fetch('/api/documents', {
    method: 'POST',
    body:   formData,
    // No establecer Content-Type: el navegador lo pone automáticamente con el boundary correcto.
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `Error HTTP ${res.status} al subir documento`);
  }

  return data;
}

// ─── deleteDocument ────────────────────────────────────────────────────────────

/**
 * Elimina un documento del Storage.
 *
 * @param {string} botId    - ID del bot propietario.
 * @param {string} fileName - blobName completo (con prefijo botId/) o nombre limpio.
 * @returns {Promise<boolean>}
 */
export async function deleteDocument(botId, fileName) {
  const encodedBotId    = encodeURIComponent(botId);
  const encodedFileName = encodeURIComponent(fileName);

  const res = await fetch(`/api/documents/${encodedBotId}/${encodedFileName}`, {
    method: 'DELETE',
  });

  if (res.status === 204) return true;

  const data = await res.json().catch(() => ({}));
  throw new Error(data.error ?? `Error HTTP ${res.status} al eliminar documento`);
}

// ─── listDocuments ─────────────────────────────────────────────────────────────

/**
 * Lista los documentos asociados a un bot.
 *
 * @param {string} botId - ID del bot.
 * @returns {Promise<Array>} Lista de metadatos: [{ name, size, blobName, uploadedAt }]
 */
export async function listDocuments(botId) {
  const res = await fetch(`/api/documents?botId=${encodeURIComponent(botId)}`);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('❌ listDocuments:', data.error);
    return [];
  }

  return data;
}
