/**
 * @fileoverview Hook de estado para gestión de chatbots.
 *
 * Usa Cosmos DB si está disponible; si no, cae a datos mock locales.
 *
 * CORRECCIÓN (v0.1.1):
 * La variable `dbInitialized` era un flag a nivel de módulo compartido entre
 * instancias. Se reemplazó por un useRef interno para que el ciclo de vida
 * de la inicialización quede ligado al ciclo de vida del componente.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { MOCK_BOTS } from '../data/mockData.js';
import { COLORS } from '../constants/index.js';
import {
  getBots as getBotsDB,
  createBot as createBotDB,
  updateBot as updateBotDB,
  initDB,
} from '../services/db.js';

export function useBots() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Ref en lugar de variable de módulo: el flag queda ligado a esta instancia del hook. */
  const dbInitialized = useRef(false);

  useEffect(() => {
    async function loadBots() {
      if (!dbInitialized.current) {
        try {
          await initDB();
          dbInitialized.current = true;
          console.log('✅ DB inicializada');
        } catch (e) {
          console.warn('⚠️ Cosmos DB no disponible, usando datos locales:', e.message);
        }
      }

      try {
        const remoteBots = await getBotsDB();
        if (remoteBots && remoteBots.length > 0) {
          setBots(remoteBots);
        } else {
          setBots(MOCK_BOTS);
        }
      } catch (e) {
        console.warn('⚠️ Error cargando bots, usando datos locales:', e.message);
        setBots(MOCK_BOTS);
      } finally {
        setIsLoading(false);
      }
    }

    loadBots();
  }, []);

  const addBot = useCallback(async (config, files) => {
    const newBot = {
      id: Date.now().toString(),
      name: config.name,
      subject: config.subject,
      level: config.level,
      tone: config.tone,
      welcome: config.welcome,
      restriction: config.restriction,
      docs: files?.length || 0,
      files: files || [],
      queries: 0,
      active: true,
      color: COLORS.indigo.mid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (dbInitialized.current) {
      try {
        await createBotDB(newBot);
      } catch (e) {
        console.error('❌ Error guardando en BD:', e.message);
      }
    }

    setBots((prev) => [newBot, ...prev]);
    return newBot;
  }, []);

  const updateBot = useCallback(async (botId, updates) => {
    const updatedData = {
      ...updates,
      id: botId,
      updatedAt: new Date().toISOString(),
    };

    if (dbInitialized.current) {
      try {
        await updateBotDB(botId, updatedData);
      } catch (e) {
        console.error('❌ Error actualizando en BD:', e.message);
      }
    }

    setBots((prev) =>
      prev.map((bot) => (bot.id === botId ? { ...bot, ...updatedData } : bot))
    );
  }, []);

  const refreshBots = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteBots = await getBotsDB();
      if (remoteBots && remoteBots.length > 0) {
        setBots(remoteBots);
      }
    } catch (e) {
      console.warn('⚠️ Error al refrescar bots:', e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    bots,
    selectedBot,
    setSelectedBot,
    addBot,
    updateBot,
    refreshBots,
    isLoading,
  };
}
