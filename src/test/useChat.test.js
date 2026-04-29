/**
 * @fileoverview Tests de useChat — lógica del chat en tiempo real.
 *
 * Cubre:
 *   1. Estado inicial: mensaje de bienvenida presente.
 *   2. sendMessage añade el mensaje del usuario al historial.
 *   3. sendMessage añade la respuesta del bot al historial.
 *   4. BUG STRICTMODE: sendMessage llama a sendChatMessage exactamente UNA vez
 *      por mensaje enviado (no dos veces por el double-invoke de StrictMode).
 *   5. Estado loading: true durante la petición, false al resolverse.
 *   6. sendMessage no hace nada si el input está vacío.
 *   7. El historial enviado a Gemini excluye el mensaje de bienvenida (índice 0).
 *   8. Los errores de red se muestran como mensaje del bot sin propagar excepción.
 */

import { renderHook, act } from '@testing-library/react';
import { useChat } from '../hooks/useChat.js';

// ── Mock de sendChatMessage ────────────────────────────────────────────────

vi.mock('../services/geminiApi.js', () => ({
  sendChatMessage: vi.fn(),
}));

import { sendChatMessage } from '../services/geminiApi.js';

// ── Fixtures ──────────────────────────────────────────────────────────────

const CONFIG = {
  name:        'Bot de Álgebra',
  subject:     'Matemáticas',
  level:       'Universitario',
  tone:        'Amigable y cercano',
  welcome:     '¡Hola! ¿En qué puedo ayudarte hoy?',
  restriction: 'guided',
};

afterEach(() => {
  vi.clearAllMocks();
});

// ── Suite ─────────────────────────────────────────────────────────────────

describe('useChat — estado inicial', () => {
  it('incluye el mensaje de bienvenida como primer mensaje del bot', () => {
    const { result } = renderHook(() => useChat(CONFIG));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('bot');
    expect(result.current.messages[0].text).toBe(CONFIG.welcome);
  });

  it('input y loading comienzan en sus valores por defecto', () => {
    const { result } = renderHook(() => useChat(CONFIG));
    expect(result.current.input).toBe('');
    expect(result.current.loading).toBe(false);
  });
});

describe('useChat — sendMessage: flujo normal', () => {
  it('agrega el mensaje del usuario y la respuesta del bot al historial', async () => {
    sendChatMessage.mockResolvedValueOnce('Las ecuaciones tienen variables.');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => {
      result.current.setInput('¿Qué es una ecuación?');
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    const msgs = result.current.messages;
    expect(msgs).toHaveLength(3); // bienvenida + usuario + bot
    expect(msgs[1]).toEqual({ role: 'user', text: '¿Qué es una ecuación?' });
    expect(msgs[2]).toEqual({ role: 'bot',  text: 'Las ecuaciones tienen variables.' });
  });

  it('limpia el input tras enviar el mensaje', async () => {
    sendChatMessage.mockResolvedValueOnce('Respuesta');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Pregunta'); });
    await act(async () => { await result.current.sendMessage(); });

    expect(result.current.input).toBe('');
  });
});

describe('useChat — BUG StrictMode (doble invocación)', () => {
  it('llama a sendChatMessage exactamente UNA vez por mensaje enviado', async () => {
    sendChatMessage.mockResolvedValue('ok');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Primera pregunta'); });
    await act(async () => { await result.current.sendMessage(); });

    // Si el bug de StrictMode estuviera presente, se llamaría 2 veces.
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
  });

  it('sigue llamando solo UNA vez en mensajes consecutivos', async () => {
    sendChatMessage.mockResolvedValue('respuesta');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Pregunta 1'); });
    await act(async () => { await result.current.sendMessage(); });

    await act(async () => { result.current.setInput('Pregunta 2'); });
    await act(async () => { await result.current.sendMessage(); });

    expect(sendChatMessage).toHaveBeenCalledTimes(2);
  });
});

describe('useChat — historial enviado a Gemini', () => {
  it('excluye el mensaje de bienvenida del historial enviado a la API', async () => {
    sendChatMessage.mockResolvedValue('respuesta');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Mi pregunta'); });
    await act(async () => { await result.current.sendMessage(); });

    // El primer argumento es userMessage; el tercero es history.
    const [, , historyArg] = sendChatMessage.mock.calls[0];

    // El mensaje de bienvenida (índice 0) no debe estar en historyArg.
    const hasBienvenida = historyArg.some(
      (m) => m.text === CONFIG.welcome && m.role === 'bot'
    );
    expect(hasBienvenida).toBe(false);
  });

  it('acumula el historial correctamente entre turnos', async () => {
    sendChatMessage
      .mockResolvedValueOnce('Respuesta 1')
      .mockResolvedValueOnce('Respuesta 2');

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Turno 1'); });
    await act(async () => { await result.current.sendMessage(); });

    await act(async () => { result.current.setInput('Turno 2'); });
    await act(async () => { await result.current.sendMessage(); });

    // En el segundo turno, el historial debe incluir "Turno 1" y "Respuesta 1".
    const [, , historyArg] = sendChatMessage.mock.calls[1];
    expect(historyArg.some((m) => m.text === 'Turno 1')).toBe(true);
    expect(historyArg.some((m) => m.text === 'Respuesta 1')).toBe(true);
  });
});

describe('useChat — loading state', () => {
  it('loading es true mientras espera y false cuando termina', async () => {
    let resolvePromise;
    sendChatMessage.mockReturnValueOnce(
      new Promise((res) => { resolvePromise = res; })
    );

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Pregunta'); });

    // Iniciar envío sin await para comprobar el estado intermedio.
    act(() => { result.current.sendMessage(); });

    expect(result.current.loading).toBe(true);

    // Resolver la promesa y comprobar que loading vuelve a false.
    await act(async () => { resolvePromise('respuesta'); });

    expect(result.current.loading).toBe(false);
  });
});

describe('useChat — manejo de errores', () => {
  it('muestra el mensaje de error del bot sin propagar excepción al caller', async () => {
    sendChatMessage.mockRejectedValueOnce(new Error('Timeout de red'));

    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { result.current.setInput('Pregunta'); });
    await act(async () => { await result.current.sendMessage(); });
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    const lastMsg = result.current.messages.at(-1);
    expect(lastMsg.role).toBe('bot');
    expect(lastMsg.text).toContain('Error: Timeout de red');
  });

  it('no hace nada si el input está vacío', async () => {
    const { result } = renderHook(() => useChat(CONFIG));

    await act(async () => { await result.current.sendMessage(); });

    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1); // solo bienvenida
  });
});
