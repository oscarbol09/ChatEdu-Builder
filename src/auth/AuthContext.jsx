/**
 * @fileoverview Contexto de autenticación de ChatEdu Builder.
 *
 * Expone: { user, isAuthenticated, login, register, logout }
 *
 * CAMBIOS (v0.2.0):
 * - Se añade la función `register()` para creación de nuevas cuentas.
 * - Rol 'docente' bloqueado en registro automático (solo admin puede crearlo en BD).
 * - `login()` ahora es async y verifica el usuario en Cosmos DB si está disponible.
 *   Si la BD no está disponible, cae a modo demo (solo localStorage).
 * - Se exporta ROLE_RESTRICTION_MSG como constante para usarla en el frontend.
 *
 * NOTA DE PRODUCCIÓN:
 * Reemplazar por Microsoft Entra ID con @azure/msal-react.
 * La interfaz pública (login, register, logout, user, isAuthenticated)
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

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  /** Carga la sesión persistida en localStorage al montar. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chatedu_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem('chatedu_user');
    }
  }, []);

  /** Persiste el usuario en estado y en localStorage. */
  const _persistUser = (u) => {
    setUser(u);
    localStorage.setItem('chatedu_user', JSON.stringify(u));
  };

  // ─── login ──────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión con email y rol.
   * - Si Cosmos DB está disponible: verifica que el usuario exista en la BD
   *   y carga su perfil real (nombre, rol guardado).
   * - Si la BD no está disponible (demo local): crea una sesión solo en localStorage.
   *
   * @param {{ email: string, role: string }} authData
   */
  const login = async (authData) => {
    if (!authData.email) throw new Error('Ingrese un correo electrónico.');

    // Intentar cargar el perfil real desde la BD.
    const dbUser = await getUserByEmail(authData.email);

    if (dbUser) {
      // Perfil encontrado: usar los datos guardados (incluye el rol real).
      _persistUser({
        email: dbUser.email,
        role:  dbUser.role,
        name:  dbUser.name,
        id:    dbUser.id,
      });
    } else {
      // BD no disponible o usuario no registrado: modo demo (cualquier correo es válido).
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
   * El frontend debe mostrar ese mensaje de manera destacada (ver Login.jsx).
   *
   * Si Cosmos DB no está disponible, el registro igual avanza en modo demo local,
   * pero el usuario no quedará persitido en la BD hasta que la conexión se restaure.
   *
   * @param {{ email: string, role: string, name?: string }} regData
   * @throws {Error} Si el rol está restringido o si el correo ya está registrado.
   */
  const register = async (regData) => {
    const role = regData.role?.toLowerCase() ?? '';

    // ── Validación de rol ────────────────────────────────────────────────────
    if (RESTRICTED_ROLES.has(role)) {
      throw new Error(ROLE_RESTRICTION_MSG);
    }

    if (!regData.email) throw new Error('Ingrese un correo electrónico.');

    // ── Verificar duplicado en BD ────────────────────────────────────────────
    const existing = await getUserByEmail(regData.email);
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo electrónico.');
    }

    // ── Crear documento de usuario ───────────────────────────────────────────
    // id === email → lookup O(1) por partition key en Cosmos DB.
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
      // Si la BD falla (ej: variables no configuradas), continuar en modo demo.
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
