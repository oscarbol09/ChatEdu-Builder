/**
 * @fileoverview Azure Function — Proxy para Azure Blob Storage (documentos).
 *
 * Rutas expuestas:
 *   GET    /api/documents?botId={id}        → listDocuments
 *   POST   /api/documents                   → uploadDocument (multipart/form-data)
 *   DELETE /api/documents/{botId}/{fileName} → deleteDocument
 *
 * NOTA — Extracción de PDF/DOCX (Paso 2):
 * El endpoint POST /api/documents subirá el archivo Y extraerá su texto
 * en la misma llamada, devolviendo { ...metadata, extractedText: string }.
 * La lógica de parseo (pdf-parse / mammoth) se añadirá en el Paso 2.
 * Por ahora se sube el binario y se devuelven solo los metadatos.
 *
 * La STORAGE_CONNECTION_STRING NUNCA sale del servidor.
 */

import { app } from '@azure/functions';
import { getStorageClients } from '../lib/storageClient.js';
import { corsHeaders, handlePreflight } from '../lib/cors.js';

// ─── GET /api/documents?botId={id} ────────────────────────────────────────────

app.http('listDocuments', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'documents',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const botId = request.query.get('botId');
      if (!botId) {
        return { status: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'El parámetro botId es obligatorio.' }) };
      }

      const { containerClient } = getStorageClients();
      const blobs = [];

      for await (const blob of containerClient.listBlobsFlat({ prefix: `${botId}/` })) {
        blobs.push({
          name:       blob.name.split('/').slice(1).join('/'), // quitar prefijo botId/
          size:       blob.properties.contentLength,
          blobName:   blob.name,
          uploadedAt: blob.properties.lastModified?.toISOString() ?? null,
        });
      }

      return { status: 200, headers: corsHeaders(), body: JSON.stringify(blobs) };
    } catch (err) {
      context.error('listDocuments:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── POST /api/documents  (multipart/form-data: field "file" + field "botId") ──

app.http('uploadDocument', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'documents',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      // Leer el body como FormData
      const formData = await request.formData();
      const botId    = formData.get('botId');
      const file     = formData.get('file'); // Blob/File object en Azure Functions v4

      if (!botId || !file) {
        return { status: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Se requieren los campos botId y file.' }) };
      }

      const { containerClient } = getStorageClients();

      // Asegurar que el contenedor existe (sin acceso público — privado por defecto)
      await containerClient.createIfNotExists();

      const fileName       = file.name ?? `upload_${Date.now()}`;
      const blobName       = `${botId}/${Date.now()}_${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const arrayBuffer = await file.arrayBuffer();
      await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: { blobContentType: file.type || 'application/octet-stream' },
      });

      const metadata = {
        name:       fileName,
        size:       file.size,
        type:       file.type,
        blobName,
        uploadedAt: new Date().toISOString(),
        // extractedText: null  ← se añadirá en el Paso 2 (pdf-parse / mammoth)
      };

      context.log(`📄 Documento subido: ${blobName}`);
      return { status: 201, headers: corsHeaders(), body: JSON.stringify(metadata) };
    } catch (err) {
      context.error('uploadDocument:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── DELETE /api/documents/{botId}/{fileName} ──────────────────────────────────

app.http('deleteDocument', {
  methods:   ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'documents/{botId}/{fileName}',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const { botId, fileName } = request.params;
      if (!botId || !fileName) {
        return { status: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Se requieren botId y fileName en la ruta.' }) };
      }

      const { containerClient } = getStorageClients();
      // El blobName almacenado en metadatos incluye el prefijo botId/ y el timestamp.
      // El cliente debe enviar el blobName completo como fileName o el nombre limpio.
      // Intentamos ambas formas por compatibilidad.
      const blobName        = fileName.includes('/') ? fileName : `${botId}/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();

      return { status: 204, headers: corsHeaders(), body: '' };
    } catch (err) {
      context.error('deleteDocument:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});
