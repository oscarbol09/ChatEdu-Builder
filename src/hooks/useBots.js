/**
 * @fileoverview Hook de estado para gestión de chatbots.
 * Usa Cosmos DB si está disponible, si no usa datos locales.
 */

import { useState, useCallback, useEffect } from 'react';
import { MOCK_BOTS } from '../data/mockData.js';
import { COLORS } from '../constants/index.js';
import { getBots as getBotsDB, createBot as createBotDB, updateBot as updateBotDB, initDB } from '../services/db.js';

let dbInitialized = false;

export function useBots() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBots() {
      console.log('🔄 Iniciando base de datos...');
      if (!dbInitialized) {
        try {
          await initDB();
          dbInitialized = true;
          console.log('✅ DB inicializada');
        } catch (e) {
          console.warn('⚠️ Cosmos DB no disponible:', e.message);
        }
      }

      try {
        console.log('🔄 Obteniendo bots de Cosmos DB...');
        const remoteBots = await getBotsDB();
        console.log('📥 Bots obtenidos:', remoteBots);
        if (remoteBots && remoteBots.length > 0) {
          setBots(remoteBots);
        } else {
          console.log('📦 No hay bots remotos, usando MOCK_BOTS');
          setBots(MOCK_BOTS);
        }
      } catch (e) {
        console.warn('⚠️ Error cargando bots:', e.message);
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

    if (dbInitialized) {
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

    if (dbInitialized) {
      try {
        await updateBotDB(botId, updatedData);
      } catch (e) {
        console.error('❌ Error actualizando en BD:', e.message);
      }
    }

    setBots((prev) => prev.map((bot) => {
      if (bot.id === botId) {
        return { ...bot, ...updatedData };
      }
      return bot;
    }));
  }, []);

  const refreshBots = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteBots = await getBotsDB();
      if (remoteBots && remoteBots.length > 0) {
        setBots(remoteBots);
      }
    } catch (e) {
      console.warn('⚠️ Error refresh:', e.message);
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
    isLoading 
  };
}