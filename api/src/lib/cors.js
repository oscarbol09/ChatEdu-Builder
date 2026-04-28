/**
 * @fileoverview Cabeceras CORS para todas las Azure Functions.
 *
 * En desarrollo local, ALLOWED_ORIGIN apunta a http://localhost:5173 (Vite).
 * En producción (Azure Static Web Apps vinculada a la Function App), SWA
 * inyecta automáticamente las cabeceras CORS correctas y este helper actúa
 * como fallback de seguridad.
 */

/**
 * Devuelve las cabeceras CORS + Content-Type listas para incluir en la respuesta.
 * @returns {Object}
 */
export function corsHeaders() {
  const origin = process.env.ALLOWED_ORIGIN ?? '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

/**
 * Intercepta peticiones OPTIONS (CORS preflight) y responde inmediatamente.
 * Llamar al inicio de cada handler: `const pre = handlePreflight(req); if (pre) return pre;`
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {Object|null} Respuesta 204 si es preflight, null en caso contrario.
 */
export function handlePreflight(request) {
  if (request.method === 'OPTIONS') {
    return {
      status:  204,
      headers: corsHeaders(),
      body:    '',
    };
  }
  return null;
}
