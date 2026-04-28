/**
 * @fileoverview Zona de carga de archivos del Paso 1 del wizard.
 * Soporta drag & drop y selección mediante diálogo del sistema.
 *
 * CAMBIOS (v0.4.0) — Lectura real de contenido:
 * - Archivos .txt y .md: se leen como texto usando FileReader y su contenido
 *   se almacena en el campo `content` de los metadatos del archivo.
 *   Este contenido luego se inyecta en el system prompt de Gemini (geminiApi.js),
 *   lo que permite al chatbot responder con base en el material real del docente.
 * - Archivos .pdf y .docx: no son parseables en el browser sin librerías pesadas.
 *   Se marcan como `status: 'pending_extraction'` para indicar que en producción
 *   deben procesarse en el servidor (Azure Functions + Apache Tika / pdfjs).
 *   El chatbot funciona sin su contenido, pero no tendrá contexto específico de esos archivos.
 * - El tamaño real del archivo se usa en lugar de un número aleatorio.
 * - Se muestra un indicador diferente según si el contenido fue extraído o no.
 */

import { useState, useRef } from 'react';
import styles from './UploadZone.module.css';

/** Tipos de archivo aceptados. */
const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md';

/** Extensiones cuyo contenido se puede leer directamente en el browser. */
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
 * Lee el contenido de un archivo de texto usando FileReader.
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
 * @param {Object} props
 * @param {Array<{id: number, name: string, size: string, status: string, content?: string}>} props.files
 * @param {(file: Object) => void} props.onAdd     - Callback al agregar un nuevo archivo.
 * @param {(id: number) => void}   props.onRemove  - Callback al eliminar un archivo de la lista.
 */
export default function UploadZone({ files, onAdd, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Procesa los archivos seleccionados:
   * - Archivos de texto → lee el contenido con FileReader.
   * - Otros formatos    → registra los metadatos y marca como pendiente de servidor.
   * @param {FileList | File[]} fileList
   */
  const processFiles = async (fileList) => {
    const fileArray = Array.from(fileList);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext  = getExt(file.name);
      const meta = {
        id:     Date.now() + i,
        name:   file.name,
        size:   formatSize(file.size),
        status: 'ready',
        content: null, // contenido extraído (solo para texto)
      };

      if (TEXT_EXTENSIONS.has(ext)) {
        // Leer el contenido real del archivo → se usará en el system prompt de Gemini.
        try {
          meta.content = await readTextFile(file);
          meta.status  = 'ready';
        } catch {
          meta.status = 'error';
        }
      } else {
        // PDF, DOCX: requieren procesamiento en servidor para extraer texto.
        meta.status = 'pending_extraction';
      }

      onAdd(meta);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    processFiles(e.target.files);
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo.
    e.target.value = '';
  };

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
        <p className={styles.dropHint} style={{ marginTop: '4px', fontSize: '11px' }}>
          TXT y MD: el contenido se inyecta directamente al chatbot · PDF y DOCX: se requiere servidor para extraer texto
        </p>
      </div>

      {/* Lista de archivos cargados */}
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
                className={styles.fileStatus}
                title={
                  f.status === 'ready'               ? 'Contenido extraído y listo para el chatbot' :
                  f.status === 'pending_extraction'  ? 'Requiere servidor para extraer texto (PDF/DOCX)' :
                  f.status === 'error'               ? 'Error al leer el archivo' : ''
                }
              >
                {f.status === 'ready'              ? '✓ Listo' :
                 f.status === 'pending_extraction' ? '⚠ Sin extracción' :
                 f.status === 'error'              ? '✗ Error' : f.status}
              </span>
              <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                aria-label={`Eliminar ${f.name}`}
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
