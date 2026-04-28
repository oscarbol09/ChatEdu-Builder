/**
 * @fileoverview Azure Function — Proxy CRUD para usuarios en Cosmos DB.
 *
 * Rutas expuestas:
 *   GET  /api/users/{email}  → getUserByEmail
 *   POST /api/users          → createUser
 *
 * El cliente React llama a estas rutas desde src/services/db.js.
 * La verificación de duplicados (userExists) se implementa dentro de createUser
 * para evitar una ida y vuelta extra al cliente.
 */

import { app } from '@azure/functions';
import { getCosmosClient } from '../lib/cosmosClient.js';
import { corsHeaders, handlePreflight } from '../lib/cors.js';
import { requireAuth } from '../lib/auth.js';

// ─── GET /api/users/{email} ────────────────────────────────────────────────────

app.http('getUserByEmail', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'users/{email}',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    const authError = requireAuth(request);
    if (authError) return authError;

    try {
      const email = request.params.email;
      if (!email) {
        return { status: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'El parámetro email es obligatorio.' }) };
      }

      const { usersContainer } = getCosmosClient();
      const { resource } = await usersContainer.item(email, email).read();

      if (!resource) {
        return { status: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Usuario no encontrado.' }) };
      }

      return { status: 200, headers: corsHeaders(), body: JSON.stringify(resource) };
    } catch (err) {
      if (err.code === 404 || err.statusCode === 404) {
        return { status: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Usuario no encontrado.' }) };
      }
      context.error('getUserByEmail:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── POST /api/users ───────────────────────────────────────────────────────────

app.http('createUser', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'users',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    const authError = requireAuth(request);
    if (authError) return authError;

    try {
      const userData = await request.json();

      if (!userData?.email) {
        return { status: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'El campo email es obligatorio.' }) };
      }

      const { usersContainer } = getCosmosClient();

      // Verificar si el usuario ya existe antes de crear (evita ida/vuelta extra al cliente)
      try {
        const { resource: existing } = await usersContainer.item(userData.email, userData.email).read();
        if (existing) {
          return { status: 409, headers: corsHeaders(), body: JSON.stringify({ error: 'Ya existe una cuenta con este correo electrónico.' }) };
        }
      } catch (notFoundErr) {
        // 404 es el resultado esperado: el usuario no existe, podemos crearlo.
        if (notFoundErr.code !== 404 && notFoundErr.statusCode !== 404) throw notFoundErr;
      }

      const { resource } = await usersContainer.items.create(userData);
      return { status: 201, headers: corsHeaders(), body: JSON.stringify(resource) };
    } catch (err) {
      context.error('createUser:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});
