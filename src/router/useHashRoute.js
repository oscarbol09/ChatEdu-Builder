/**
 * @fileoverview Router de hash (HashRouter) minimalista para ChatEdu Builder.
 *
 * Usa window.location.hash para enrutar entre vistas sin dependencias externas
 * ni configuración de servidor. Compatible con Azure Static Web Apps sin
 * necesitar staticwebapp.config.json con reglas de rewrite.
 *
 * Rutas manejadas:
 *   #/              → App principal (dashboard + builder)
 *   #/explore       → Portal de estudiantes (catálogo de chatbots)
 *   #/bot/:id       → Vista pública del chatbot (sin login requerido)
 *
 * Uso:
 *   import { useHashRoute } from '../router/useHashRoute.js';
 *   const { route, params } = useHashRoute();
 *
 *   route === 'bot'    → params.id = 'abc123'
 *   route === 'explore' → catálogo de chatbots
 *   route === 'app'     → vista principal
 */

import { useState, useEffect } from 'react';

/**
 * Parsea el hash actual de la URL y devuelve { route, params }.
 * @returns {{ route: string, params: Record<string, string> }}
 */
function parseHash() {
  // window.location.hash es "#/bot/abc123" → quitamos el "#"
  const hash = window.location.hash.replace(/^#/, '') || '/';

  // Ruta pública del chatbot: /bot/:id
  const botMatch = hash.match(/^\/bot\/(.+)$/);
  if (botMatch) {
    return { route: 'bot', params: { id: decodeURIComponent(botMatch[1]) } };
  }

  // Ruta de exploración de estudiantes: /explore
  if (hash === '/explore') {
    return { route: 'explore', params: {} };
  }

  // Cualquier otra ruta → app principal
  return { route: 'app', params: {} };
}

/**
 * Hook que devuelve la ruta activa y los params extraídos del hash.
 * Se actualiza automáticamente cuando el hash cambia (navegación, botón atrás).
 *
 * @returns {{ route: 'app' | 'bot', params: Record<string, string> }}
 */
export function useHashRoute() {
  const [location, setLocation] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setLocation(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return location;
}

/**
 * Navega a una ruta hash de forma programática.
 * @param {string} path - Ruta sin el "#", ej: '/bot/abc123' o '/'
 */
export function navigateTo(path) {
  window.location.hash = path;
}
