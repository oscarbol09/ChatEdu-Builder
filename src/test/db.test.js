/**
 * @fileoverview Tests de src/services/db.js — capa de acceso a datos vía proxy.
 *
 * Estrategia: mock global de fetch para interceptar las llamadas HTTP y
 * verificar que cada función del servicio:
 *   a) Llama al endpoint correcto (/api/bots, /api/users, etc.)
 *   b) Usa el método HTTP correcto (GET, POST, PUT, DELETE)
 *   c) Serializa el cuerpo correctamente
 *   d) Devuelve los datos del servidor al caller
 *   e) Maneja correctamente los errores HTTP (404, 500)
 *
 * No se prueban credenciales ni Cosmos DB: esos son tests del backend.
 * Este archivo prueba SOLO la capa cliente (contrato de la interfaz fetch).
 */

import {
  getBotsByUser,
  getBotById,
  createBot,
  updateBot,
  deleteBot
} from '../services/db.js';

// ── Mock de msalTokenHelper para que getAccessToken devuelva null
// (sin sesión MSAL en tests unitarios) y no intente importar
// @azure/msal-browser en el entorno jsdom. ────────────────────────────────
vi.mock('../../services/msalTokenHelper.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  msalRef:        { instance: null },
}));

// ── Mock global de fetch ──────────────────────────────────────────────────

/**
 * Crea un mock de Response con status y body JSON dados.
 * @param {any}    body
 * @param {number} [status=200]
 */
function mockFetch(body, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok:     status >= 200 && status < 300,
    status,
    json:   () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── getBotsByUser ─────────────────────────────────────────────────────────

describe('getBotsByUser', () => {
  it('llama a GET /api/bots?userId={email} y devuelve el array', async () => {
    const bots = [{ id: '1', name: 'Bot 1' }];
    mockFetch(bots);

    const result = await getBotsByUser('prof@uni.edu');

    expect(fetch).toHaveBeenCalledWith(
      '/api/bots?userId=prof%40uni.edu',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(result).toEqual(bots);
  });

  it('devuelve [] cuando userId es falsy', async () => {
    global.fetch = vi.fn();
    const result = await getBotsByUser('');
    expect(fetch).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('devuelve [] si la petición falla (sin lanzar excepción al caller)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await getBotsByUser('prof@uni.edu');
    expect(result).toEqual([]);
  });
});

// ── getBotById ────────────────────────────────────────────────────────────

describe('getBotById', () => {
  it('llama a GET /api/bots/{id} y devuelve el bot', async () => {
    const bot = { id: 'abc', name: 'Bot Álgebra' };
    mockFetch(bot);

    const result = await getBotById('abc');

    expect(fetch).toHaveBeenCalledWith(
      '/api/bots/abc',
      expect.any(Object)
    );
    expect(result).toEqual(bot);
  });

  it('devuelve null si el servidor responde 404', async () => {
    mockFetch({ error: 'Bot no encontrado.' }, 404);
    const result = await getBotById('no-existe');
    expect(result).toBeNull();
  });
});

// ── createBot ─────────────────────────────────────────────────────────────

describe('createBot', () => {
  it('llama a POST /api/bots con el body serializado y devuelve el bot creado', async () => {
    const newBot = { id: '999', name: 'Nuevo Bot', userId: 'prof@uni.edu' };
    mockFetch(newBot, 201);

    const result = await createBot(newBot);

    expect(fetch).toHaveBeenCalledWith(
      '/api/bots',
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify(newBot),
      })
    );
    expect(result).toEqual(newBot);
  });
});

// ── updateBot ─────────────────────────────────────────────────────────────

describe('updateBot', () => {
  it('llama a PUT /api/bots/{id} con los cambios y devuelve el bot actualizado', async () => {
    const updated = { id: '123', name: 'Bot Actualizado' };
    mockFetch(updated);

    const result = await updateBot('123', { name: 'Bot Actualizado' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/bots/123',
      expect.objectContaining({
        method: 'PUT',
        body:   JSON.stringify({ name: 'Bot Actualizado' }),
      })
    );
    expect(result).toEqual(updated);
  });
});

// ── deleteBot ─────────────────────────────────────────────────────────────

describe('deleteBot', () => {
  it('llama a DELETE /api/bots/{id} y devuelve true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:     true,
      status: 204,
      json:   () => Promise.resolve(null),
    });

    const result = await deleteBot('123');

    expect(fetch).toHaveBeenCalledWith(
      '/api/bots/123',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(result).toBe(true);
  });
});
