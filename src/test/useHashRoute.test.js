/**
 * @fileoverview Tests de useHashRoute y navigateTo.
 *
 * Cubre:
 *   1. Parseo de ruta raíz → { route: 'app', params: {} }
 *   2. Parseo de ruta de bot → { route: 'bot', params: { id } }
 *   3. ID con caracteres especiales codificados en URL
 *   4. Rutas desconocidas → fallback a 'app'
 *   5. Actualización reactiva al cambiar el hash (evento hashchange)
 *   6. navigateTo escribe correctamente en window.location.hash
 */

import { renderHook, act } from '@testing-library/react';
import { useHashRoute, navigateTo } from '../../router/useHashRoute.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Simula un cambio de hash y dispara el evento hashchange. */
function setHash(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new Event('hashchange'));
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('useHashRoute — parseo de rutas', () => {
  afterEach(() => {
    // Limpiar el hash tras cada test para evitar contaminación entre tests.
    window.location.hash = '';
  });

  it('devuelve route="app" para el hash vacío (ruta raíz)', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('app');
    expect(result.current.params).toEqual({});
  });

  it('devuelve route="app" para el hash #/', () => {
    window.location.hash = '#/';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('app');
  });

  it('devuelve route="bot" con params.id para #/bot/{id}', () => {
    window.location.hash = '#/bot/abc123';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('bot');
    expect(result.current.params.id).toBe('abc123');
  });

  it('decodifica correctamente IDs con caracteres especiales (%40 → @)', () => {
    window.location.hash = '#/bot/usuario%40dominio.com';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.params.id).toBe('usuario@dominio.com');
  });

  it('devuelve route="app" para rutas desconocidas (fallback)', () => {
    window.location.hash = '#/ruta-inexistente/xyz';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('app');
  });

  it('acepta IDs numéricos largos (timestamps)', () => {
    window.location.hash = '#/bot/1718200000000';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toBe('bot');
    expect(result.current.params.id).toBe('1718200000000');
  });
});

describe('useHashRoute — reactividad al hashchange', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('actualiza la ruta cuando cambia el hash', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useHashRoute());

    expect(result.current.route).toBe('app');

    act(() => setHash('#/bot/nuevo-bot'));

    expect(result.current.route).toBe('bot');
    expect(result.current.params.id).toBe('nuevo-bot');
  });

  it('vuelve a "app" al navegar de vuelta a la raíz', () => {
    window.location.hash = '#/bot/alguno';
    const { result } = renderHook(() => useHashRoute());

    act(() => setHash('#/'));

    expect(result.current.route).toBe('app');
    expect(result.current.params).toEqual({});
  });
});

describe('navigateTo', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('escribe la ruta correctamente en window.location.hash', () => {
    navigateTo('/bot/test-id');
    expect(window.location.hash).toBe('#/bot/test-id');
  });

  it('escribe la ruta raíz correctamente', () => {
    navigateTo('/');
    expect(window.location.hash).toBe('#/');
  });
});
