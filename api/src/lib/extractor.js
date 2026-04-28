/**
 * @fileoverview Módulo de extracción de texto de documentos binarios (server-side).
 *
 * Formatos soportados:
 *   .pdf   → pdf-parse   (extrae texto de capas de texto; no hace OCR de imágenes)
 *   .docx  → mammoth     (extrae texto y tablas; descarta estilos e imágenes)
 *   .txt
 *   .md    → Buffer → string UTF-8 (ya son texto plano)
 *
 * La función principal `extractText` recibe un Buffer con el contenido binario
 * del archivo y su nombre de fichero, y devuelve el texto extraído como string.
 *
 * Si la extracción falla (archivo corrupto, formato no reconocido, etc.)
 * devuelve null para que el caller pueda decidir cómo manejarlo sin romper
 * el flujo del upload.
 *
 * LIMITACIONES CONOCIDAS:
 * - PDF escaneados (solo imagen): pdf-parse no extrae texto → devuelve ''.
 *   Para OCR real se necesitaría Azure AI Document Intelligence (Paso futuro).
 * - DOCX con contenido solo en imágenes/diagramas: mammoth los omite.
 * - Archivos protegidos con contraseña: la extracción falla y devuelve null.
 *
 * TRUNCADO:
 * Para proteger el contexto de Gemini (límite de tokens), el texto extraído
 * se trunca a MAX_TOTAL_CHARS. El mismo límite existe en geminiApi.js del
 * servidor (MAX_DOC_CHARS por documento). Aquí el truncado es una segunda
 * línea de defensa para el almacenamiento en Cosmos DB / respuesta HTTP.
 */

import pdfParse from 'pdf-parse';
import mammoth  from 'mammoth';

/** Máximo de caracteres a devolver por documento (~200 000 tokens aprox.) */
const MAX_TOTAL_CHARS = 100_000;

/**
 * Devuelve la extensión de un nombre de archivo en minúsculas, con punto.
 * @param {string} fileName
 * @returns {string}  ej. '.pdf', '.docx', '.txt'
 */
function getExt(fileName = '') {
  const idx = fileName.lastIndexOf('.');
  return idx !== -1 ? fileName.slice(idx).toLowerCase() : '';
}

/**
 * Trunca un string a maxChars caracteres añadiendo una nota al final.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
function truncate(text, maxChars = MAX_TOTAL_CHARS) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[...documento truncado por límite de contexto]';
}

/**
 * Extrae el texto legible de un documento binario.
 *
 * @param {Buffer} buffer   - Contenido binario del archivo.
 * @param {string} fileName - Nombre del archivo (usado para inferir el formato).
 * @returns {Promise<string|null>}
 *   - string: texto extraído (puede ser vacío si el PDF es solo imagen).
 *   - null:   la extracción falló irrecuperablemente.
 */
export async function extractText(buffer, fileName) {
  const ext = getExt(fileName);

  try {
    switch (ext) {
      case '.pdf': {
        const result = await pdfParse(buffer);
        return truncate((result.text ?? '').trim());
      }

      case '.docx': {
        const result = await mammoth.extractRawText({ buffer });
        // mammoth devuelve mensajes de advertencia en result.messages; los ignoramos.
        return truncate((result.value ?? '').trim());
      }

      case '.txt':
      case '.md': {
        return truncate(buffer.toString('utf-8').trim());
      }

      default:
        // Formato no reconocido: no intentamos extraer.
        return null;
    }
  } catch (err) {
    // No propagamos el error — el upload puede seguir aunque la extracción falle.
    console.error(`[extractText] Error extrayendo texto de ${fileName}:`, err.message);
    return null;
  }
}
