/**
 * @fileoverview Azure Function — Proxy CRUD para bots en Cosmos DB.
 *
 * Rutas expuestas:
 *   GET    /api/bots?userId={email}  → getBotsByUser
 *   GET    /api/bots/{id}            → getBotById
 *   POST   /api/bots                 → createBot
 *   PUT    /api/bots/{id}            → updateBot
 *   DELETE /api/bots/{id}            → deleteBot
 *
 * El cliente React llama a estas rutas desde src/services/db.js.
 * Las credenciales de Cosmos DB nunca salen del servidor.
 */

import { app } from '@azure/functions';
import { getCosmosClient } from '../lib/cosmosClient.js';
import { corsHeaders, handlePreflight } from '../lib/cors.js';

// ─── GET /api/bots?userId={email} ─────────────────────────────────────────────

app.http('getBots', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'bots',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const userId = request.query.get('userId');
      if (!userId) {
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'El parámetro userId es obligatorio.' }),
        };
      }

      const { botsContainer } = getCosmosClient();
      const { resources } = await botsContainer.items
        .query(
          {
            query:      'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          },
          { enableCrossPartitionQuery: true }
        )
        .fetchAll();

      return {
        status:  200,
        headers: corsHeaders(),
        body:    JSON.stringify(resources),
      };
    } catch (err) {
      context.error('getBots:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── GET /api/bots/{id} ────────────────────────────────────────────────────────

app.http('getBotById', {
  methods:   ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'bots/{id}',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const id = request.params.id;
      const { botsContainer } = getCosmosClient();
      const { resource } = await botsContainer.item(id, id).read();

      if (!resource) {
        return { status: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Bot no encontrado.' }) };
      }

      return { status: 200, headers: corsHeaders(), body: JSON.stringify(resource) };
    } catch (err) {
      if (err.code === 404 || err.statusCode === 404) {
        return { status: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Bot no encontrado.' }) };
      }
      context.error('getBotById:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── POST /api/bots ────────────────────────────────────────────────────────────

app.http('createBot', {
  methods:   ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'bots',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const bot = await request.json();

      if (!bot?.id || !bot?.userId) {
        return {
          status:  400,
          headers: corsHeaders(),
          body:    JSON.stringify({ error: 'El cuerpo debe incluir los campos id y userId.' }),
        };
      }

      const { botsContainer } = getCosmosClient();
      const { resource } = await botsContainer.items.create(bot);

      return { status: 201, headers: corsHeaders(), body: JSON.stringify(resource) };
    } catch (err) {
      context.error('createBot:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── PUT /api/bots/{id} ────────────────────────────────────────────────────────

app.http('updateBot', {
  methods:   ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'bots/{id}',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const id      = request.params.id;
      const updates = await request.json();
      const payload = { ...updates, id };

      const { botsContainer } = getCosmosClient();
      const { resource } = await botsContainer.items.upsert(payload);

      return { status: 200, headers: corsHeaders(), body: JSON.stringify(resource) };
    } catch (err) {
      context.error('updateBot:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});

// ─── DELETE /api/bots/{id} ─────────────────────────────────────────────────────

app.http('deleteBot', {
  methods:   ['DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route:     'bots/{id}',
  handler: async (request, context) => {
    const pre = handlePreflight(request);
    if (pre) return pre;

    try {
      const id = request.params.id;
      const { botsContainer } = getCosmosClient();
      await botsContainer.item(id, id).delete();

      return { status: 204, headers: corsHeaders(), body: '' };
    } catch (err) {
      context.error('deleteBot:', err.message);
      return { status: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
    }
  },
});
