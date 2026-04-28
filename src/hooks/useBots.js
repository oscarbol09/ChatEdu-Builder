/**
 * @fileoverview Hook de estado para gestión de chatbots.
 *
 * Usa Cosmos DB si está disponible; si no, cae a localStorage.
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
 *
 * CAMBIOS (v0.3.3):
 * - localStorage como fuente de verdad en browser. Cosmos DB está bloqueado
 *   por CORS desde el browser; initDB() lanza error inmediatamente en ese
 *   entorno. El hook siempre persiste en `chatedu_bots` de localStorage
 *   y carga desde ahí cuando la BD no está disponible.
 * - Se elimina la dependencia de MOCK_BOTS para usuarios con sesión activa.
 *   Un array vacío de localStorage es válido para un docente sin bots aún.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth }   from '../auth/AuthContext.jsx';
import { COLORS }    from '../constants/index.js';
import {
  getBotsByUser,
  createBot  as createBotDB,
  updateBot  as updateBotDB,
  deleteBot  as deleteBotDB,
  initDB,
} from '../services/db.js';

// ─── Helpers de localStorage ──────────────────────────────────────────────────

const LS_KEY = 'chatedu_bots';

/** Lee los bots del usuario activo desde localStorage. */
function readFromLocalStorage(userId) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    return Array.isArray(all) ? all.filter((b) => b.userId === userId) : [];
  } catch {
    return [];
  }
}

/**
 * Persiste el array de bots del usuario activo en localStorage.
 * Conserva los bots de otros usuarios que ya estuvieran guardados.
 */
function writeToLocalStorage(userId, updatedUserBots) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const others = Array.isArray(all) ? all.filter((b) => b.userId !== userId) : [];
    localStorage.setItem(LS_KEY, JSON.stringify([...others, ...updatedUserBots]));
  } catch {
    // localStorage lleno o inaccesible: no crítico
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

      // 1. Intentar inicializar Cosmos DB.
      //    En browser, initDB() lanza error inmediatamente (CORS).
      //    En ese caso caemos directo a localStorage.
      if (!dbInitialized.current) {
        try {
          await initDB();
          dbInitialized.current = true;
        } catch (e) {
          console.warn('⚠️ Cosmos DB no disponible, usando localStorage:', e.message);
          const cached = readFromLocalStorage(user.email);
          setBots(cached);
          setIsLoading(false);
          return;
        }
      }

      // 2. Cargar los bots del usuario desde la BD.
      try {
        const userBots = await getBotsByUser(user.email);
        setBots(userBots);
      } catch (e) {
        console.warn('⚠️ Error cargando bots del usuario:', e.message);
        const cached = readFromLocalStorage(user.email);
        setBots(cached);
      } finally {
        setIsLoading(false);
      }
    }

    loadBots();
  }, [user?.email]);

  // ─── CRUD de bots ─────────────────────────────────────────────────────────

  /**
   * Crea un bot nuevo, lo guarda en localStorage y (si está disponible) en Cosmos DB.
   *
   * @param {Object} config  - Configuración del bot (nombre, asignatura, etc.).
   * @param {Array}  files   - Metadatos de archivos (del UploadZone).
   * @returns {Promise<Object>} El bot creado.
   */
  const addBot = useCallback(async (config, files) => {
    const userId = user?.email ?? 'anonymous';
    const newBot = {
      id:          Date.now().toString(),
      userId,
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

    // Actualizar estado local primero (UI inmediata).
    const updatedBots = [newBot, ...bots];
    setBots(updatedBots);

    // Persistir siempre en localStorage (fuente de verdad en browser).
    writeToLocalStorage(userId, updatedBots);

    // Intentar también en Cosmos DB si está disponible (entorno Node/server).
    if (dbInitialized.current) {
      try {
        await createBotDB(newBot);
        console.log('✅ Bot guardado en BD:', newBot.name);
      } catch (e) {
        console.warn('⚠️ Bot no guardado en BD:', e.message);
      }
    }

    return newBot;
  }, [user?.email, bots]);

  /**
   * Actualiza un bot existente en localStorage y en BD si está disponible.
   * @param {string} botId   - ID del bot.
   * @param {Object} updates - Campos a actualizar (puede incluir `files`).
   */
  const updateBot = useCallback(async (botId, updates) => {
    const userId = user?.email ?? 'anonymous';
    const sanitizedFiles = Array.isArray(updates.files)
      ? updates.files.map(({ id, name, size, status }) => ({ id, name, size, status }))
      : undefined;

    const updatedData = {
      ...updates,
      ...(sanitizedFiles !== undefined && { files: sanitizedFiles, docs: sanitizedFiles.length }),
      id:        botId,
      userId,
      updatedAt: new Date().toISOString(),
    };

    const updatedBots = bots.map((bot) => (bot.id === botId ? { ...bot, ...updatedData } : bot));
    setBots(updatedBots);
    writeToLocalStorage(userId, updatedBots);

    if (dbInitialized.current) {
      try {
        await updateBotDB(botId, updatedData);
        console.log('✅ Bot actualizado en BD:', botId);
      } catch (e) {
        console.error('❌ Error actualizando bot en BD:', e.message);
      }
    }
  }, [user?.email, bots]);

  /**
   * Elimina un bot de localStorage y de la BD si está disponible.
   * @param {string} botId - ID del bot a eliminar.
   */
  const removeBot = useCallback(async (botId) => {
    const userId = user?.email ?? 'anonymous';
    const updatedBots = bots.filter((bot) => bot.id !== botId);
    setBots(updatedBots);
    writeToLocalStorage(userId, updatedBots);
    setSelectedBot((prev) => (prev?.id === botId ? null : prev));

    if (dbInitialized.current) {
      try {
        await deleteBotDB(botId);
        console.log('✅ Bot eliminado de BD:', botId);
      } catch (e) {
        console.error('❌ Error eliminando bot de BD:', e.message);
      }
    }
  }, [user?.email, bots]);

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
      const cached = readFromLocalStorage(user.email);
      setBots(cached);
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
