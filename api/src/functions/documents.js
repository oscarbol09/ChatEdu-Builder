/**
 * @fileoverview Azure Function — Proxy para Azure Blob Storage (documentos).
 *
 * v2.0.0 — Paso 2: Extracción real de texto (pdf-parse / mammoth).
 *
 * Rutas expuestas:
 *   GET    /api/documents?botId={id}         → listDocuments
 *   POST   /api/documents                    → uploadDocument + extracción de texto
 *   DELETE /api/documents/{botId}/{fileName} → deleteDocument
 *
 * FLUJO DE uploadDocument:
 *   1. Recibe multipart/form-data con campos "file" (binario) y "botId".
 *   2. Convierte el File a Buffer.
 *   3. Llama a extractText(buffer, fileName) → string | null.
 *   4. Sube el binario original a Blob Storage (preserva el archivo intacto).
 *   5. Devuelve los metadatos + extractedText al cliente.
 *      El cliente (UploadZone) almacena extractedText en su estado local y lo
 *      pasa a useChat → sendChatMessage → /api/chat, que lo inyecta en el
 *      system prompt de Gemini.
 *
 * La STORAGE_CONNECTION_STRING NUNCA sale del servidor.
 */

import { app } from '@azure/functions';
import { getStorageClients } from '../lib/storageClient.js';
import { corsHeaders, handlePreflight } from '../lib/cors.js';
import { extractText } from '../lib/extractor.js';

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
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'El parámetro botId es obligatorio.' }),
        };
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

// ─── POST /api/documents  (multipart/form-data: "file" + "botId") ─────────────

app.http('uploadDocument', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'documents',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const formData = await request.formData();
      const botId    = formData.get('botId');
      const file     = formData.get('file'); // Web API File/Blob en Azure Functions v4

      if (!botId || !file) {
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'Se requieren los campos botId y file.' }),
        };
      }

      const fileName = file.name ?? `upload_${Date.now()}`;

      // ── 1. Convertir a Buffer (necesario para pdf-parse y mammoth) ──────────
      const arrayBuffer = await file.arrayBuffer();
      const buffer      = Buffer.from(arrayBuffer);

      // ── 2. Extraer texto (no bloquea el upload si falla) ───────────────────
      const extracted = await extractText(buffer, fileName);

      const extractionStatus =
        extracted === null   ? 'error'          :  // extracción falló
        extracted === ''     ? 'empty'          :  // PDF solo-imagen u otro vacío
                               'ready';             // texto disponible

      context.log(
        `📄 Extracción [${fileName}]: status=${extractionStatus}` +
        (extracted ? ` (${extracted.length} chars)` : '')
      );

      // ── 3. Subir binario original a Blob Storage ───────────────────────────
      const { containerClient } = getStorageClients();
      await containerClient.createIfNotExists();

      const blobName        = `${botId}/${Date.now()}_${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: file.type || 'application/octet-stream' },
      });

      // ── 4. Responder con metadatos + texto extraído ────────────────────────
      const metadata = {
        name:             fileName,
        size:             file.size,
        type:             file.type,
        blobName,
        uploadedAt:       new Date().toISOString(),
        extractedText:    extracted,       // string | null
        extractionStatus,                  // 'ready' | 'empty' | 'error'
      };

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
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'Se requieren botId y fileName en la ruta.' }),
        };
      }

      const { containerClient } = getStorageClients();
      // fileName puede llegar como blobName completo (con prefijo) o como nombre limpio.
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
