/**
 * @fileoverview Contexto de autenticación de ChatEdu Builder.
 *
 * Expone: { user, isAuthenticated, isAuthLoading, login, register, logout }
 *
 * CAMBIOS (v1.0.0 — Paso 1 de seguridad):
 * - TEST_ADMIN ahora requiere VITE_ENABLE_TEST_ADMIN=true en .env para activarse.
 *   En producción esta variable no debe existir o debe ser 'false'.
 *
 * CAMBIOS (v0.3.0):
 * - Se añade `isAuthLoading` para evitar el bug de salto de Login en Azure.
 *
 * CAMBIOS (v0.2.0):
 * - Se añade `register()`. Rol 'docente' bloqueado en auto-registro.
 * - `login()` verifica usuario en Cosmos DB (ahora vía proxy /api/users).
 *
 * NOTA DE PRODUCCIÓN:
 * Reemplazar por Microsoft Entra ID con @azure/msal-react.
 * La interfaz pública no debe cambiar para que el reemplazo sea transparente.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserByEmail, createUser } from '../services/db.js';

// ─── Constantes de rol ────────────────────────────────────────────────────────

/** Roles que no pueden auto-registrarse. Solo un admin los crea directamente en BD. */
const RESTRICTED_ROLES = new Set(['docente', 'profesor']);

/**
 * Mensaje canónico que se muestra cuando un usuario intenta registrarse como docente.
 * Se exporta para que el componente Login.jsx lo muestre en su propia UI.
 */
export const ROLE_RESTRICTION_MSG =
  'La creación de cuentas para Docentes/Profesores está restringida. ' +
  'Por favor, comuníquese con el administrador del sistema para solicitar su acceso.';

// ─── Usuario de prueba (testeo) ───────────────────────────────────────────────

/**
 * Cuenta de administrador para testeo rápido.
 * Login: email "admin", contraseña "admin".
 * NO requiere Cosmos DB ni variables de entorno.
 *
 * ACTIVACIÓN: solo disponible cuando VITE_ENABLE_TEST_ADMIN=true en .env local.
 * En producción (.env de Azure Static Web Apps o Application Settings),
 * esta variable debe ser 'false' o no estar definida para deshabilitar
 * este bypass completamente y no exponer credenciales en el bundle.
 */
const TEST_ADMIN_ENABLED  = import.meta.env.VITE_ENABLE_TEST_ADMIN === 'true';
const TEST_ADMIN_EMAIL    = 'admin';
const TEST_ADMIN_PASSWORD = 'admin';
const TEST_ADMIN_PROFILE  = {
  id:    'admin',
  email: 'admin',
  name:  'Administrador',
  role:  'docente',
};

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,          setUser]          = useState(null);

  /**
   * isAuthLoading: true mientras se lee localStorage en el primer montaje.
   *
   * POR QUÉ ES NECESARIO:
   * Sin este flag, AppInner evalúa isAuthenticated en el primer render
   * (cuando user === null) y concluye que el usuario NO está autenticado,
   * mostrando Login. Un tick después, el useEffect hidrata user desde
   * localStorage y isAuthenticated cambia a true, causando un salto
   * inmediato al Dashboard sin que el usuario haya introducido credenciales.
   * En Azure Static Web Apps este comportamiento era consistente porque el
   * localStorage persiste entre sesiones del navegador.
   *
   * Con isAuthLoading=true durante la hidratación, AppInner espera antes
   * de renderizar Login o Dashboard, eliminando el salto.
   */
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  /** Carga la sesión persistida en localStorage al montar. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chatedu_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem('chatedu_user');
    } finally {
      // Marcar como resuelto SIEMPRE, haya o no sesión guardada.
      setIsAuthLoading(false);
    }
  }, []);

  /** Persiste el usuario en estado y en localStorage. */
  const _persistUser = (u) => {
    setUser(u);
    localStorage.setItem('chatedu_user', JSON.stringify(u));
  };

  // ─── login ──────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión con email (y contraseña opcional para el usuario de prueba).
   *
   * Orden de resolución:
   *   1. Si VITE_ENABLE_TEST_ADMIN=true Y email === "admin" Y password === "admin" → sesión local.
   *   2. Verifica el usuario en /api/users vía proxy.
   *   3. Fallback demo: cualquier correo es válido (solo localStorage).
   *
   * @param {{ email: string, role: string, password?: string }} authData
   */
  const login = async (authData) => {
    if (!authData.email) throw new Error('Ingrese un correo electrónico.');

    // ── 1. Usuario de prueba admin/admin (solo si está habilitado en .env) ────
    if (
      TEST_ADMIN_ENABLED &&
      authData.email.trim().toLowerCase() === TEST_ADMIN_EMAIL &&
      authData.password === TEST_ADMIN_PASSWORD
    ) {
      _persistUser(TEST_ADMIN_PROFILE);
      return;
    }

    // ── 2. Verificar en Cosmos DB vía proxy /api/users ────────────────────────
    const dbUser = await getUserByEmail(authData.email);

    if (dbUser) {
      _persistUser({
        email: dbUser.email,
        role:  dbUser.role,
        name:  dbUser.name,
        id:    dbUser.id,
      });
    } else {
      // ── 3. Modo demo ──────────────────────────────────────────────────────
      const demoUser = {
        email: authData.email,
        role:  authData.role,
        name:  authData.email.split('@')[0],
      };
      _persistUser(demoUser);
    }
  };

  // ─── register ───────────────────────────────────────────────────────────────

  /**
   * Registra un nuevo usuario.
   *
   * REGLA: Si el rol es 'docente' o 'profesor', lanza un error con ROLE_RESTRICTION_MSG.
   *
   * @param {{ email: string, role: string, name?: string }} regData
   * @throws {Error} Si el rol está restringido o si el correo ya está registrado.
   */
  const register = async (regData) => {
    const role = regData.role?.toLowerCase() ?? '';

    if (RESTRICTED_ROLES.has(role)) {
      throw new Error(ROLE_RESTRICTION_MSG);
    }

    if (!regData.email) throw new Error('Ingrese un correo electrónico.');

    const existing = await getUserByEmail(regData.email);
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo electrónico.');
    }

    const newUser = {
      id:        regData.email,
      email:     regData.email,
      name:      (regData.name || '').trim() || regData.email.split('@')[0],
      role:      regData.role,
      createdAt: new Date().toISOString(),
    };

    try {
      await createUser(newUser);
      console.log('✅ Usuario registrado en BD:', newUser.email);
    } catch (dbError) {
      console.warn('⚠️ No se pudo guardar el usuario en BD (modo demo):', dbError.message);
    }

    _persistUser(newUser);
  };

  // ─── logout ─────────────────────────────────────────────────────────────────

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chatedu_user');
  };

  // ─── Valor del contexto ──────────────────────────────────────────────────────

  const value = {
    user,
    isAuthenticated: !!user,
    isAuthLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return ctx;
};
