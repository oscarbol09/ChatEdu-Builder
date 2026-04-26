/**
 * @fileoverview Zona de carga de archivos del Paso 1 del wizard.
 * Soporta drag & drop y selección mediante diálogo del sistema.
 * Simula el procesamiento de archivos (en producción, enviar al servidor para RAG).
 */

import { useState, useRef } from 'react';
import styles from './UploadZone.module.css';

/** Tipos de archivo aceptados. */
const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md';

/**
 * @param {Object} props
 * @param {Array<{id: number, name: string, size: string, status: string}>} props.files
 *   Lista de archivos ya cargados.
 * @param {(file: Object) => void} props.onAdd - Callback al agregar un nuevo archivo.
 * @param {(id: number) => void} props.onRemove - Callback al eliminar un archivo de la lista.
 */
export default function UploadZone({ files, onAdd, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Simula el procesamiento del archivo y lo agrega a la lista con un delay escalonado.
   * En producción, aquí se haría el upload real al servidor.
   * @param {string[]} names - Nombres de los archivos a procesar.
   */
  const simulateUpload = (names) => {
    names.forEach((name, i) => {
      setTimeout(() => {
        onAdd({
          id:     Date.now() + i,
          name,
          size:   `${(Math.random() * 2 + 0.3).toFixed(1)} MB`,
          status: 'ready',
        });
      }, i * 300);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const names = Array.from(e.dataTransfer.files).map((f) => f.name);
    simulateUpload(names);
  };

  const handleFileInput = (e) => {
    const names = Array.from(e.target.files).map((f) => f.name);
    simulateUpload(names);
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
              <span className={styles.fileStatus}>Procesado</span>
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
