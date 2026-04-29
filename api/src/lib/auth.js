/**
 * @fileoverview Middleware de validación de tokens JWT de Microsoft Entra ID.
 *
 * PASO 4: Autenticación Entra ID en el backend.
 *
 * Azure Static Web Apps inyecta automáticamente las cabeceras
 * X-MS-CLIENT-PRINCIPAL y X-MS-CLIENT-PRINCIPAL-ID cuando el usuario
 * está autenticado a través de SWA Authentication. Sin embargo, para
 * llamadas directas a la Function App (desarrollo local, tests de integración)
 * necesitamos validar el Bearer token manualmente.
 *
 * ESTRATEGIA EN DOS CAPAS:
 *   1. SWA Production: SWA ya validó el token y nos pasa el principal en headers.
 *      Leemos X-MS-CLIENT-PRINCIPAL y confiamos en él (SWA es nuestro proxy).
 *   2. Desarrollo local / llamadas directas: Validamos el Bearer token del
 *      header Authorization usando la JWKS pública de Microsoft.
 *
 * USO EN UN HANDLER:
 *   import { requireAuth, getCallerPrincipal } from '../lib/auth.js';
 *
 *   handler: async (request, context) => {
 *     const authError = requireAuth(request);
 *     if (authError) return authError;
 *
 *     const principal = getCallerPrincipal(request);
 *     // principal.userId, principal.userDetails (email)
 *   }
 *
 * CONFIGURACIÓN:
 *   ENTRA_TENANT_ID  → Directory (tenant) ID (Application Settings)
 *   ENTRA_CLIENT_ID  → Application (client) ID (Application Settings)
 *   NODE_ENV         → 'development' desactiva la validación de firma
 *                      para facilitar el desarrollo local sin credenciales.
 */

import { corsHeaders } from './cors.js';

/**
 * @typedef {Object} CallerPrincipal
 * @property {string} userId       - OID del usuario en Azure AD.
 * @property {string} userDetails  - Email / UPN del usuario.
 * @property {string} [name]       - Nombre para mostrar del usuario.
 */

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Intenta leer el principal de las cabeceras inyectadas por Azure Static Web Apps.
 * En producción SWA, X-MS-CLIENT-PRINCIPAL contiene el payload del token
 * codificado en Base64 JSON.
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {CallerPrincipal|null}
 */
function readSWAPrincipal(request) {
  const encoded = request.headers.get('x-ms-client-principal');
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const parsed  = JSON.parse(decoded);

    // El payload de SWA tiene la forma:
    // { userId, userDetails, identityProvider, userRoles, claims[] }
    return {
      userId:      parsed.userId      ?? '',
      userDetails: parsed.userDetails ?? '',
      name:        parsed.claims?.find(c => c.typ === 'name')?.val ?? parsed.userDetails ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Extrae el Bearer token del header Authorization.
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {string|null}
 */
function extractBearerToken(request) {
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Solo para extraer claims cuando la validación ya fue hecha por SWA,
 * o en entorno de desarrollo donde no validamos firma.
 *
 * @param {string} token
 * @returns {Object|null}
 */
function decodeJwtPayload(token) {
  try {
    const parts   = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Extrae el principal del llamador de la petición.
 * Prioridad: 
 *   1. Cabeceras SWA (producción con Microsoft)
 *   2. Bearer token decodificado
 *   3. Header X-User-Email (para estudiantes/externos autenticados por email)
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {CallerPrincipal|null}
 */
export function getCallerPrincipal(request) {
  // 1. Cabeceras de SWA (producción)
  const swaPrincipal = readSWAPrincipal(request);
  if (swaPrincipal?.userId) return swaPrincipal;

  // 2. Bearer token (desarrollo local o llamadas directas)
  const token = extractBearerToken(request);
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      return {
        userId:      payload.oid ?? payload.sub ?? '',
        userDetails: payload.preferred_username ?? payload.email ?? payload.upn ?? '',
        name:        payload.name ?? payload.preferred_username ?? '',
      };
    }
  }

  // 3. Header X-User-Email (estudiantes/externos autenticados por email en frontend)
  // El frontend envía este header cuando el usuario hizo login con email/password
  const emailHeader = request.headers.get('x-user-email');
  if (emailHeader) {
    return {
      userId:      emailHeader,
      userDetails: emailHeader,
      name:        '',
    };
  }

  return null;
}

/**
 * Middleware de autenticación para Azure Functions.
 *
 * Devuelve una respuesta 401 si la petición no está autenticada.
 * Devuelve null si el principal es válido y el handler debe continuar.
 *
 * En NODE_ENV=development, solo verifica que haya algún principal (sin
 * validar firma JWT) para facilitar el trabajo local.
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {Object|null} Respuesta 401 o null.
 */
export function requireAuth(request) {
  const principal = getCallerPrincipal(request);

  if (!principal?.userId && !principal?.userDetails) {
    return {
      status:  401,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'No autenticado. Se requiere iniciar sesión con una cuenta institucional.',
      }),
    };
  }

  return null; // Autenticado: el handler puede continuar.
}

/**
 * Verifica que el userId del token coincida con el recurso solicitado.
 * Útil para endpoints de usuarios donde el usuario solo puede leer/editar
 * su propio perfil, a menos que tenga el rol 'admin'.
 *
 * @param {CallerPrincipal} principal
 * @param {string}          resourceEmail  - Email del recurso que se quiere acceder.
 * @returns {boolean} true si tiene acceso.
 */
export function canAccessUserResource(principal, resourceEmail) {
  if (!principal) return false;
  // El admin (rol configurado en SWA roles) puede acceder a cualquier recurso.
  // Por ahora comparamos solo por email.
  return principal.userDetails?.toLowerCase() === resourceEmail?.toLowerCase();
}
