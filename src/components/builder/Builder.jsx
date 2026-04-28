/**
 * @fileoverview Orquestador del wizard de creación/edición de chatbot (4 pasos).
 *
 * CAMBIOS (v1.0.0) — Paso 2: integración con extracción real de documentos:
 * - Se pasa `botId` a UploadZone para que pueda llamar a /api/documents.
 * - Se pasa `onUploadingChange` para bloquear "Siguiente" mientras haya
 *   archivos PDF/DOCX en proceso de upload/extracción.
 * - canNext() en el paso 0 también comprueba que no haya uploads activos.
 * - onAdd ahora hace upsert por id: si el archivo ya existe (actualización
 *   tras extracción), reemplaza; si no, añade. Esto evita duplicados cuando
 *   UploadZone llama onAdd dos veces para el mismo archivo (estado 'uploading'
 *   → estado 'ready' / 'error').
 *
 * Recibe initialBot para modo edición (desde "Configurar") o null para creación nueva.
 */

import { useState, useEffect } from 'react';
import styles from './Builder.module.css';
import StepBar from '../ui/StepBar.jsx';
import UploadZone from './UploadZone.jsx';
import BotConfigForm from './BotConfigForm.jsx';
import ChatPreview from './ChatPreview.jsx';
import DeployPanel from './DeployPanel.jsx';
import { DEFAULT_BOT_CONFIG } from '../../constants/index.js';

/**
 * @param {Object}        props
 * @param {Object|null}   props.initialBot - Bot existente para editar, o null para crear nuevo.
 * @param {Function}      props.onFinish   - Callback al crear nuevo: (config, files) => void.
 * @param {Function}      props.onUpdate   - Callback al actualizar: (botId, config, files) => void.
 * @param {Function}      props.onCancel
 */
export default function Builder({ initialBot, onFinish, onUpdate, onCancel }) {
  const [step,        setStep]        = useState(0);
  const [files,       setFiles]       = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * ID temporal generado cuando se crea un bot nuevo y aún no tiene ID de Cosmos DB.
   * Se usa en DeployPanel y como botId para el upload de documentos antes de guardar.
   * En modo edición, usamos el ID real del bot existente.
   */
  const [tempBotId] = useState(() => Date.now().toString());
  const activeBotId = initialBot?.id ?? tempBotId;

  const [config, setConfig] = useState(() => {
    if (initialBot) {
      return {
        name:        initialBot.name        || '',
        subject:     initialBot.subject     || 'Matemáticas',
        level:       initialBot.level       || 'Universitario',
        tone:        initialBot.tone        || 'Amigable y cercano',
        welcome:     initialBot.welcome     || '',
        restriction: initialBot.restriction || 'guided',
      };
    }
    return DEFAULT_BOT_CONFIG;
  });

  const isEditMode = Boolean(initialBot);

  useEffect(() => {
    if (initialBot?.files) {
      setFiles(initialBot.files);
    } else if (!initialBot) {
      setFiles([]);
    }
  }, [initialBot]);

  useEffect(() => {
    if (initialBot) {
      setConfig({
        name:        initialBot.name        || '',
        subject:     initialBot.subject     || 'Matemáticas',
        level:       initialBot.level       || 'Universitario',
        tone:        initialBot.tone        || 'Amigable y cercano',
        welcome:     initialBot.welcome     || '',
        restriction: initialBot.restriction || 'guided',
      });
    } else {
      setConfig(DEFAULT_BOT_CONFIG);
    }
  }, [initialBot]);

  /**
   * Upsert por id: si el archivo ya existe (actualización tras extracción),
   * lo reemplaza; si es nuevo, lo añade al final.
   * Esto evita duplicados cuando UploadZone llama onAdd dos veces para el
   * mismo archivo (estado 'uploading' → estado 'ready'/'error').
   */
  const handleAddFile = (newFile) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === newFile.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = newFile;
        return updated;
      }
      return [...prev, newFile];
    });
  };

  const canNext = () => {
    if (step === 0) return files.length > 0 && !isUploading;
    if (step === 1) return config.name.trim().length > 0;
    return true;
  };

  const handleFinish = () => {
    if (isEditMode && onUpdate) {
      onUpdate(initialBot.id, config, files);
    } else if (onFinish) {
      onFinish(config, files);
    }
    setStep(0);
    setFiles([]);
    setConfig(DEFAULT_BOT_CONFIG);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onCancel();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditMode ? `Editando: ${initialBot.name}` : 'Crear nuevo chatbot'}
        </h1>
        <p className={styles.subtitle}>
          {isEditMode
            ? 'Modifica la configuración de tu asistente educativo'
            : 'Configura tu asistente educativo en 4 pasos'}
        </p>
      </div>

      <StepBar current={step} />

      <div className={styles.card}>
        {step === 0 && (
          <>
            <h2 className={styles.stepTitle}>Carga tus materiales</h2>
            <p className={styles.stepDesc}>
              Sube los documentos del curso. El chatbot construirá su base de conocimiento a partir de ellos.
            </p>
            <UploadZone
              files={files}
              botId={activeBotId}
              onAdd={handleAddFile}
              onRemove={(id) => setFiles((prev) => prev.filter((x) => x.id !== id))}
              onUploadingChange={setIsUploading}
            />
            {isUploading && (
              <p className={styles.uploadingHint}>
                ⏳ Procesando documentos… Espera a que todos estén listos antes de continuar.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h2 className={styles.stepTitle}>Configura el chatbot</h2>
            <p className={styles.stepDesc}>Define el nombre, tono y comportamiento de tu asistente.</p>
            <BotConfigForm config={config} onChange={setConfig} />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className={styles.stepTitle}>Vista previa en vivo</h2>
            <p className={styles.stepDesc}>
              Interactúa con tu chatbot antes de publicarlo. Las respuestas son generadas por IA en tiempo real.
            </p>
            <ChatPreview
              config={config}
              documents={files
                .filter((f) => f.content)
                .map((f) => f.content)}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className={styles.stepTitle}>Publicar e integrar</h2>
            <p className={styles.stepDesc}>
              Obtén el enlace o el código de incrustación para integrarlo en tu LMS o sitio web.
            </p>
            <DeployPanel config={config} botId={activeBotId} />
          </>
        )}
      </div>

      <div className={styles.nav}>
        <button onClick={handleBack} className={styles.backBtn}>
          {step === 0 ? 'Cancelar' : '← Anterior'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className={`${styles.nextBtn} ${!canNext() ? styles.nextBtnDisabled : ''}`}
          >
            Siguiente →
          </button>
        ) : (
          <button onClick={handleFinish} className={styles.finishBtn}>
            {isEditMode ? '✓ Guardar cambios' : '✓ Publicar chatbot'}
          </button>
        )}
      </div>
    </div>
  );
}
