/**
 * @fileoverview Orquestador del wizard de creación/edición de chatbot (4 pasos).
 * Recibe initialBot para modo edición (desde "Configurar") o null para creación nueva.
 */

import { useState } from 'react';
import styles from './Builder.module.css';
import StepBar from '../ui/StepBar.jsx';
import UploadZone from './UploadZone.jsx';
import BotConfigForm from './BotConfigForm.jsx';
import ChatPreview from './ChatPreview.jsx';
import DeployPanel from './DeployPanel.jsx';
import { DEFAULT_BOT_CONFIG } from '../../constants/index.js';

/**
 * @param {Object} props
 * @param {Object|null} props.initialBot - Bot existente para editar, o null para crear nuevo.
 * @param {(config: Object, docsCount: number) => void} props.onFinish
 * @param {() => void} props.onCancel
 */
export default function Builder({ initialBot, onFinish, onCancel }) {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);

  /** Si viene en modo edición, precargar los campos del bot existente. */
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

  const canNext = () => {
    if (step === 0) return files.length > 0;
    if (step === 1) return config.name.trim().length > 0;
    return true;
  };

  const handleFinish = () => {
    onFinish(config, files.length);
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
              onAdd={(f) => setFiles((prev) => [...prev, f])}
              onRemove={(id) => setFiles((prev) => prev.filter((x) => x.id !== id))}
            />
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
            <ChatPreview config={config} />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className={styles.stepTitle}>Publicar e integrar</h2>
            <p className={styles.stepDesc}>
              Obtén el enlace o el código de incrustación para integrarlo en tu LMS o sitio web.
            </p>
            <DeployPanel config={config} />
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
