/**
 * @fileoverview Zona de carga de archivos del Paso 1 del wizard.
 * Soporta drag & drop y selección mediante diálogo del sistema.
 *
 * CAMBIOS (v1.0.0) — Extracción real vía Azure Functions (Paso 2):
 * - PDF y DOCX: se suben al backend (/api/documents) que extrae el texto
 *   con pdf-parse / mammoth y lo devuelve en `extractedText`.
 *   El resultado se almacena en `file.content` para que Builder.jsx lo
 *   inyecte al system prompt de Gemini a través de ChatPreview → useChat.
 * - TXT y MD: se siguen leyendo localmente con FileReader (sin round-trip
 *   al servidor, ya que el browser puede leerlos directamente).
 * - Estados posibles por archivo:
 *     uploading         → subiendo al servidor (spinner)
 *     ready             → texto disponible y listo para el chatbot
 *     empty             → subido OK, pero el PDF era solo imagen (sin capa de texto)
 *     error             → fallo de red o extracción imposible
 * - El botón "Siguiente" del wizard se bloquea mientras haya archivos en
 *   estado 'uploading' (gestionado en Builder.jsx a través de canNext()).
 *   Para ello, se expone el flag `isUploading` vía prop onUploadingChange.
 *
 * CONTRATO CON Builder.jsx (sin cambios necesarios en Builder):
 * - onAdd(meta)    → meta.content contiene el texto extraído (string | null).
 * - onRemove(id)   → elimina el archivo de la lista.
 * - files[]        → array de metadatos gestionado por Builder como estado.
 */

import { useState, useRef } from 'react';
import { uploadDocument } from '../../services/storage.js';
import styles from './UploadZone.module.css';

/** Tipos de archivo aceptados. */
const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md';

/** Extensiones que el browser puede leer directamente (sin round-trip al servidor). */
const TEXT_EXTENSIONS = new Set(['.txt', '.md']);

/**
 * Formatea bytes a una cadena legible (KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Obtiene la extensión de un nombre de archivo en minúsculas.
 * @param {string} name
 * @returns {string} ej: '.txt', '.pdf'
 */
function getExt(name = '') {
  const idx = name.lastIndexOf('.');
  return idx !== -1 ? name.slice(idx).toLowerCase() : '';
}

/**
 * Lee el contenido de un archivo de texto plano usando FileReader.
 * @param {File} file
 * @returns {Promise<string>}
 */
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * @param {Object}   props
 * @param {Array}    props.files            - Lista de metadatos de archivos (estado en Builder).
 * @param {string}   props.botId            - ID del bot activo (necesario para el upload al servidor).
 * @param {Function} props.onAdd            - Callback al agregar un archivo: onAdd(meta).
 * @param {Function} props.onRemove         - Callback al eliminar un archivo: onRemove(id).
 * @param {Function} [props.onUploadingChange] - Notifica a Builder si hay uploads en curso: (bool) => void.
 */
export default function UploadZone({ files, botId, onAdd, onRemove, onUploadingChange }) {
  const [isDragging,    setIsDragging]    = useState(false);

  /**
   * Conjunto de IDs de archivos cuyo upload todavía no ha terminado.
   * Se usa para mostrar spinner individual y para bloquear "Siguiente" en Builder.
   */
  const [_uploadingIds, setUploadingIds]  = useState(new Set());
  const fileInputRef = useRef(null);

  /** Marca un archivo como "en progreso" y notifica a Builder. */
  const markUploading = (id) => {
    setUploadingIds((prev) => {
      const next = new Set(prev).add(id);
      onUploadingChange?.(next.size > 0);
      return next;
    });
  };

  /** Quita un archivo del conjunto de "en progreso" y notifica a Builder. */
  const unmarkUploading = (id) => {
    setUploadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      onUploadingChange?.(next.size > 0);
      return next;
    });
  };

  /**
   * Procesa cada archivo seleccionado:
   *   - TXT / MD  → FileReader local → content listo inmediatamente.
   *   - PDF / DOCX → uploadDocument() → backend extrae texto → content disponible
   *                  cuando resuelve la promesa.
   *
   * En ambos casos se llama a onAdd() en cuanto tenemos los metadatos básicos
   * (con status 'uploading' para PDF/DOCX) y luego se actualiza el registro
   * con onAdd() de nuevo cuando llega la respuesta del servidor.
   * Como Builder mantiene el array por id, el segundo onAdd sobrescribe el primero.
   *
   * @param {FileList | File[]} fileList
   */
  const processFiles = async (fileList) => {
    const fileArray = Array.from(fileList);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext  = getExt(file.name);
      const id   = Date.now() + i;

      if (TEXT_EXTENSIONS.has(ext)) {
        // ── Texto plano: leer en el browser, sin servidor ──────────────────
        const meta = {
          id,
          name:    file.name,
          size:    formatSize(file.size),
          status:  'ready',
          content: null,
        };
        try {
          meta.content = await readTextFile(file);
        } catch {
          meta.status = 'error';
        }
        onAdd(meta);

      } else {
        // ── PDF / DOCX: subir al servidor y esperar extracción ─────────────

        // 1. Registrar inmediatamente con estado 'uploading' para mostrar el spinner.
        onAdd({
          id,
          name:    file.name,
          size:    formatSize(file.size),
          status:  'uploading',
          content: null,
        });
        markUploading(id);

        // 2. Upload asíncrono (no bloquea los demás archivos del lote).
        uploadDocument(botId, file)
          .then((result) => {
            // result = { name, size, type, blobName, uploadedAt, extractedText, extractionStatus }
            onAdd({
              id,
              name:    file.name,
              size:    formatSize(file.size),
              blobName: result.blobName,
              status:  result.extractionStatus ?? 'ready',  // 'ready' | 'empty' | 'error'
              content: result.extractedText ?? null,
            });
          })
          .catch((err) => {
            console.error(`❌ uploadDocument [${file.name}]:`, err.message);
            onAdd({
              id,
              name:    file.name,
              size:    formatSize(file.size),
              status:  'error',
              content: null,
            });
          })
          .finally(() => {
            unmarkUploading(id);
          });
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    processFiles(e.target.files);
    e.target.value = ''; // Permite seleccionar el mismo archivo de nuevo.
  };

  // ─── Labels y tooltips por estado ──────────────────────────────────────────

  const statusLabel = (status) => ({
    uploading: '⏳ Subiendo…',
    ready:     '✓ Listo',
    empty:     '⚠ Sin texto',
    error:     '✗ Error',
  }[status] ?? status);

  const statusTooltip = (status) => ({
    uploading: 'Subiendo al servidor y extrayendo texto…',
    ready:     'Texto extraído y listo para el chatbot',
    empty:     'El PDF no contiene capa de texto (solo imágenes). El chatbot no podrá usarlo como contexto.',
    error:     'No se pudo extraer el texto. El archivo fue guardado pero el chatbot no tendrá su contenido.',
  }[status] ?? '');

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Zona de drop */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivos"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className={styles.fileInput}
          onChange={handleFileInput}
        />
        <svg className={styles.uploadIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className={styles.dropTitle}>Arrastra archivos o haz clic para cargar</p>
        <p className={styles.dropHint}>PDF, DOCX, TXT, MD · Máx. 50 MB por archivo</p>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((f) => (
            <li key={f.id} className={styles.fileItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" className={styles.fileIcon}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div className={styles.fileMeta}>
                <p className={styles.fileName}>{f.name}</p>
                <p className={styles.fileSize}>{f.size}</p>
              </div>
              <span
                className={`${styles.fileStatus} ${styles[`status_${f.status}`] ?? ''}`}
                title={statusTooltip(f.status)}
              >
                {statusLabel(f.status)}
              </span>
              <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                aria-label={`Eliminar ${f.name}`}
                disabled={f.status === 'uploading'}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
