/**
 * @fileoverview Hook de estado para gestión de chatbots.
 *
 * Usa Cosmos DB si está disponible; si no, cae a datos mock locales.
 *
 * CAMBIOS (v0.2.0):
 * - Importa `useAuth` para asociar cada bot al usuario activo (`userId`).
 * - Usa `getBotsByUser(user.email)` en lugar de `getBots()` → cada usuario
 *   ve solo sus propios bots.
 * - `addBot()` incluye `userId` en el documento guardado en Cosmos DB.
 * - Corregida la lógica de fallback: el array vacío de DB es válido para un
 *   usuario nuevo; MOCK_BOTS solo se usa cuando la DB es inaccesible.
 * - Se añade `removeBot()` que elimina el bot de BD y de estado local.
 * - Se añade `isLoading` exportado para que los componentes puedan mostrar
 *   indicadores de carga mientras se inicializa la DB.
 * - Los archivos (campo `files`) se guardan como metadatos serializables
 *   { id, name, size, status } — nunca como objetos File del navegador.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth }   from '../auth/AuthContext.jsx';
import { MOCK_BOTS } from '../data/mockData.js';
import { COLORS }    from '../constants/index.js';
import {
  getBotsByUser,
  createBot  as createBotDB,
  updateBot  as updateBotDB,
  deleteBot  as deleteBotDB,
  initDB,
} from '../services/db.js';

export function useBots() {
  const { user } = useAuth();

  const [bots,        setBots]        = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  /**
   * Ref en lugar de variable de módulo: el flag queda ligado al ciclo de vida
   * de esta instancia del hook (AGENT.md §4).
   */
  const dbInitialized = useRef(false);

  // ─── Carga inicial de bots ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.email) {
      setBots([]);
      setIsLoading(false);
      return;
    }

    async function loadBots() {
      setIsLoading(true);

      // 1. Inicializar la BD (solo una vez por montaje del hook).
      if (!dbInitialized.current) {
        try {
          await initDB();
          dbInitialized.current = true;
        } catch (e) {
          console.warn('⚠️ Cosmos DB no disponible, usando datos demo:', e.message);
          setBots(MOCK_BOTS);
          setIsLoading(false);
          return; // Sin BD no tiene sentido intentar fetch.
        }
      }

      // 2. Cargar los bots del usuario desde la BD.
      try {
        const userBots = await getBotsByUser(user.email);
        // Array vacío = usuario nuevo sin bots. No se muestra MOCK_BOTS.
        setBots(userBots);
      } catch (e) {
        console.warn('⚠️ Error cargando bots del usuario:', e.message);
        setBots(MOCK_BOTS);
      } finally {
        setIsLoading(false);
      }
    }

    loadBots();
  }, [user?.email]); // re-ejecutar si cambia el usuario activo

  // ─── CRUD de bots ─────────────────────────────────────────────────────────

  /**
   * Crea un bot nuevo, lo guarda en Cosmos DB y lo añade al estado local.
   *
   * El campo `files` almacena metadatos serializables:
   *   { id: number, name: string, size: string, status: string }
   * Nunca se guarda el objeto File del navegador.
   *
   * @param {Object} config  - Configuración del bot (nombre, asignatura, etc.).
   * @param {Array}  files   - Metadatos de archivos (del UploadZone).
   * @returns {Promise<Object>} El bot creado.
   */
  const addBot = useCallback(async (config, files) => {
    const newBot = {
      id:          Date.now().toString(),
      userId:      user?.email ?? 'anonymous',
      name:        config.name,
      subject:     config.subject,
      level:       config.level,
      tone:        config.tone,
      welcome:     config.welcome,
      restriction: config.restriction,
      docs:        files?.length ?? 0,
      files:       (files ?? []).map(({ id, name, size, status }) => ({ id, name, size, status })),
      queries:     0,
      active:      true,
      color:       COLORS.indigo.mid,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };

    if (dbInitialized.current) {
      try {
        await createBotDB(newBot);
        console.log('✅ Bot guardado en BD:', newBot.name);
      } catch (e) {
        console.error('❌ Error guardando bot en BD:', e.message);
      }
    }

    setBots((prev) => [newBot, ...prev]);
    return newBot;
  }, [user?.email]);

  /**
   * Actualiza un bot existente en BD y en estado local.
   * @param {string} botId   - ID del bot.
   * @param {Object} updates - Campos a actualizar (puede incluir `files`).
   */
  const updateBot = useCallback(async (botId, updates) => {
    const sanitizedFiles = Array.isArray(updates.files)
      ? updates.files.map(({ id, name, size, status }) => ({ id, name, size, status }))
      : undefined;

    const updatedData = {
      ...updates,
      ...(sanitizedFiles !== undefined && { files: sanitizedFiles, docs: sanitizedFiles.length }),
      id:        botId,
      userId:    user?.email ?? 'anonymous',
      updatedAt: new Date().toISOString(),
    };

    if (dbInitialized.current) {
      try {
        await updateBotDB(botId, updatedData);
        console.log('✅ Bot actualizado en BD:', botId);
      } catch (e) {
        console.error('❌ Error actualizando bot en BD:', e.message);
      }
    }

    setBots((prev) =>
      prev.map((bot) => (bot.id === botId ? { ...bot, ...updatedData } : bot))
    );
  }, [user?.email]);

  /**
   * Elimina un bot de la BD y del estado local.
   * @param {string} botId - ID del bot a eliminar.
   */
  const removeBot = useCallback(async (botId) => {
    if (dbInitialized.current) {
      try {
        await deleteBotDB(botId);
        console.log('✅ Bot eliminado de BD:', botId);
      } catch (e) {
        console.error('❌ Error eliminando bot de BD:', e.message);
      }
    }

    setBots((prev) => prev.filter((bot) => bot.id !== botId));

    // Si el bot eliminado estaba seleccionado, limpiar la selección.
    setSelectedBot((prev) => (prev?.id === botId ? null : prev));
  }, []);

  /**
   * Fuerza una recarga de los bots desde la BD (útil tras operaciones externas).
   */
  const refreshBots = useCallback(async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const userBots = await getBotsByUser(user.email);
      setBots(userBots);
    } catch (e) {
      console.warn('⚠️ Error al refrescar bots:', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  return {
    bots,
    selectedBot,
    setSelectedBot,
    addBot,
    updateBot,
    removeBot,
    refreshBots,
    isLoading,
  };
}
