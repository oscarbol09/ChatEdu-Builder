/**
 * @fileoverview Contexto de autenticación de ChatEdu Builder.
 *
 * Expone: { user, isAuthenticated, isAuthLoading, login, register, logout }
 *
 * CAMBIOS (v0.3.0):
 * - Se añade `isAuthLoading` (boolean). Mientras es true, AppInner muestra un
 *   estado de espera en lugar de decidir entre Login y app principal. Esto
 *   SOLUCIONA el bug donde la app saltaba el Login en Azure porque la sesión
 *   persistida en localStorage se restauraba sin pasar por el formulario:
 *   en visitas recurrentes el usuario llegaba directo al Dashboard.
 * - Se añade usuario de prueba admin / contraseña admin para testeo rápido.
 *   Funciona sin BD ni variables de entorno.
 *
 * CAMBIOS (v0.2.0):
 * - Se añade la función `register()` para creación de nuevas cuentas.
 * - Rol 'docente' bloqueado en registro automático.
 * - `login()` ahora es async y verifica el usuario en Cosmos DB si está disponible.
 * - Se exporta ROLE_RESTRICTION_MSG como constante para Login.jsx.
 *
 * NOTA DE PRODUCCIÓN:
 * Reemplazar por Microsoft Entra ID con @azure/msal-react.
 * La interfaz pública (login, register, logout, user, isAuthenticated, isAuthLoading)
 * no debe cambiar para que el reemplazo sea transparente en el resto de la app.
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
 * ELIMINAR o proteger antes de pasar a producción real con usuarios reales.
 */
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
   *   1. Si email === "admin" y password === "admin" → sesión de testeo local.
   *   2. Si Cosmos DB está disponible → verifica que el usuario exista en BD.
   *   3. Fallback demo: cualquier correo es válido (solo localStorage).
   *
   * @param {{ email: string, role: string, password?: string }} authData
   */
  const login = async (authData) => {
    if (!authData.email) throw new Error('Ingrese un correo electrónico.');

    // ── 1. Usuario de prueba admin/admin ─────────────────────────────────────
    if (
      authData.email.trim().toLowerCase() === TEST_ADMIN_EMAIL &&
      authData.password === TEST_ADMIN_PASSWORD
    ) {
      _persistUser(TEST_ADMIN_PROFILE);
      return;
    }

    // ── 2. Verificar en Cosmos DB ─────────────────────────────────────────────
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
