/**
 * @fileoverview Hook de estado global para la gestión de chatbots.
 *
 * Centraliza el estado de la lista de bots y el bot seleccionado,
 * que es compartido entre las vistas Dashboard y Analytics (AGENT.md §4).
 * Las vistas no modifican el estado de bots directamente; llaman a las
 * funciones expuestas por este hook.
 */

import { useState, useCallback } from 'react';
import { MOCK_BOTS } from '../data/mockData.js';
import { COLORS } from '../constants/index.js';

/**
 * Gestiona el CRUD de chatbots y la selección activa para analítica.
 *
 * @returns {{
 *   bots: Array<Object>,
 *   selectedBot: Object|null,
 *   setSelectedBot: React.Dispatch,
 *   addBot: (config: Object, docsCount: number) => void
 * }}
 */
export function useBots() {
  /** Lista de bots. Inicializada con datos mock para demo. */
  const [bots, setBots] = useState(MOCK_BOTS);

  /** Bot actualmente seleccionado para ver su analítica. */
  const [selectedBot, setSelectedBot] = useState(null);

  /**
   * Crea un nuevo bot a partir de la configuración del wizard y lo agrega al inicio de la lista.
   *
   * @param {Object} config - Configuración completada en el wizard.
   * @param {string} config.name - Nombre del chatbot.
   * @param {string} config.subject - Asignatura.
   * @param {string} config.level - Nivel educativo.
   * @param {number} docsCount - Número de documentos cargados en el Paso 1.
   */
  const addBot = useCallback((config, docsCount) => {
    /** @type {Object} Nueva entrada de bot construida desde el wizard. */
    const newBot = {
      id:      Date.now(),
      name:    config.name,
      subject: config.subject,
      level:   config.level,
      docs:    docsCount,
      queries: 0,
      active:  true,
      color:   COLORS.indigo.mid,
    };
    setBots((prev) => [newBot, ...prev]);
  }, []);

  return { bots, selectedBot, setSelectedBot, addBot };
}
