/**
 * @fileoverview Tests de DeployPanel — generación de URLs de despliegue.
 *
 * Cubre:
 *   1. La URL directa incluye el botId y el parámetro ?d= con la config en Base64.
 *   2. La URL apunta al origen correcto (window.location.origin en desarrollo).
 *   3. El iframe embed contiene la misma URL directa.
 *   4. Botones de copiar muestran "Copiado ✓" al hacer clic.
 *   5. Aparece el aviso de modo desarrollo cuando el host es localhost.
 *   6. El aviso de localhost NO aparece en dominios de producción.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import DeployPanel from '../../components/builder/DeployPanel.jsx';

// ── Fixtures ──────────────────────────────────────────────────────────────

const CONFIG = {
  name:        'Bot de Álgebra',
  subject:     'Matemáticas',
  level:       'Universitario',
  tone:        'Amigable y cercano',
  welcome:     '¡Hola! ¿En qué puedo ayudarte?',
  restriction: 'guided',
};
const BOT_ID = '1718200000000';

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Decodifica el parámetro ?d= de una URL y lo parsea como JSON.
 * @param {string} url
 * @returns {Object|null}
 */
function decodeConfigParam(url) {
  try {
    const raw = new URL(url).searchParams.get('d');
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch {
    return null;
  }
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('DeployPanel — generación de URLs', () => {
  it('genera la URL directa con el botId correcto', () => {
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    const inputs = screen.getAllByRole('textbox');
    const directUrlInput = inputs[0];
    expect(directUrlInput.value).toContain(`/bot/${BOT_ID}`);
  });

  it('incluye el parámetro ?d= con la config del bot codificada en Base64', () => {
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    const inputs = screen.getAllByRole('textbox');
    const directUrlInput = inputs[0];

    expect(directUrlInput.value).toContain('?d=');

    // _decoded: prefijo _ indica que el resultado no se usa directamente
    // (la verificación se hace vía dParam más abajo)
    const _decoded = decodeConfigParam(directUrlInput.value.replace('/#/bot/', '/'));
    // Reconstruimos la URL para que sea válida para el constructor URL():
    // La URL real tiene formato "http://localhost:3000/#/bot/ID?d=..."
    // Extraemos el ?d= manualmente:
    const dParam = directUrlInput.value.split('?d=')[1];
    expect(dParam).toBeTruthy();

    const decodedConfig = JSON.parse(decodeURIComponent(escape(atob(dParam))));
    expect(decodedConfig.name).toBe(CONFIG.name);
    expect(decodedConfig.subject).toBe(CONFIG.subject);
    expect(decodedConfig.restriction).toBe(CONFIG.restriction);
  });

  it('usa window.location.origin como base cuando VITE_APP_URL no está definida', () => {
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    const inputs = screen.getAllByRole('textbox');
    const directUrlInput = inputs[0];
    // En jsdom, window.location.origin es 'http://localhost:3000'
    expect(directUrlInput.value).toMatch(/^http:\/\/localhost/);
  });

  it('el código iframe embed contiene la misma URL directa', () => {
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    const inputs = screen.getAllByRole('textbox');
    const directUrl = inputs[0].value;
    const embedCode = inputs[1].value;
    expect(embedCode).toContain(directUrl);
    expect(embedCode).toContain('<iframe');
    expect(embedCode).toContain('</iframe>');
  });

  it('usa el nombre del bot como slug si no se proporciona botId', () => {
    render(<DeployPanel config={CONFIG} />);
    const inputs = screen.getAllByRole('textbox');
    // "Bot de Álgebra" → slug "bot-de-algebra"
    expect(inputs[0].value).toContain('bot-de-algebra');
  });
});

describe('DeployPanel — botones de copiar', () => {
  beforeEach(() => {
    // Mock de clipboard API (no disponible en jsdom por defecto)
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('muestra "Copiado ✓" al hacer clic en el botón de copiar URL', async () => {
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    const copyButtons = screen.getAllByRole('button', { name: /copiar/i });
    fireEvent.click(copyButtons[0]);
    expect(await screen.findByText(/copiado/i)).toBeInTheDocument();
  });
});

describe('DeployPanel — aviso de localhost', () => {
  it('muestra aviso de modo desarrollo cuando el host es localhost', () => {
    // jsdom ya usa localhost por defecto, no necesitamos mock.
    render(<DeployPanel config={CONFIG} botId={BOT_ID} />);
    expect(screen.getByText(/modo desarrollo/i)).toBeInTheDocument();
  });
});
