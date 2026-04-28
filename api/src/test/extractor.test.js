/**
 * @fileoverview Tests de api/src/lib/extractor.js — extracción de texto de documentos.
 *
 * Estrategia: se usan Buffers construidos en memoria para evitar fixtures de
 * archivos reales. Para PDF y DOCX se mockean las librerías externas
 * (pdf-parse y mammoth) ya que sus outputs dependen del contenido binario
 * real, que no queremos gestionar en el repo de tests.
 *
 * Cubre:
 *   1. TXT: extrae texto UTF-8 del Buffer correctamente.
 *   2. MD:  extrae texto UTF-8 del Buffer correctamente.
 *   3. PDF: delega a pdf-parse y devuelve result.text.
 *   4. DOCX: delega a mammoth y devuelve result.value.
 *   5. Formato desconocido (.xlsx, .png, etc.): devuelve null.
 *   6. Truncado: textos > 100 000 chars se truncan con nota al final.
 *   7. Resiliencia: si pdf-parse lanza excepción, devuelve null (no propaga).
 *   8. Resiliencia: si mammoth lanza excepción, devuelve null (no propaga).
 *   9. PDF solo-imagen (pdf-parse devuelve ''): devuelve '' (no null).
 *  10. Nombre de archivo sin extensión: devuelve null.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── Mocks de las librerías de extracción ──────────────────────────────────

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

import pdfParse from 'pdf-parse';
import mammoth  from 'mammoth';
import { extractText } from '../lib/extractor.js';

afterEach(() => {
  vi.clearAllMocks();
});

// ── TXT ───────────────────────────────────────────────────────────────────

describe('extractText — TXT', () => {
  it('extrae el texto UTF-8 de un Buffer .txt', async () => {
    const text   = 'Hola, esto es un archivo de texto.';
    const buffer = Buffer.from(text, 'utf-8');
    const result = await extractText(buffer, 'lectura.txt');
    expect(result).toBe(text);
  });

  it('recorta espacios en blanco del inicio y el final', async () => {
    const buffer = Buffer.from('  \n texto con espacios \n  ', 'utf-8');
    const result = await extractText(buffer, 'notas.txt');
    expect(result).toBe('texto con espacios');
  });
});

// ── MD ────────────────────────────────────────────────────────────────────

describe('extractText — MD', () => {
  it('extrae el texto de un Buffer .md', async () => {
    const md     = '# Título\n\nPárrafo de contenido.';
    const buffer = Buffer.from(md, 'utf-8');
    const result = await extractText(buffer, 'README.md');
    expect(result).toBe(md);
  });
});

// ── PDF ───────────────────────────────────────────────────────────────────

describe('extractText — PDF', () => {
  it('delega a pdf-parse y devuelve el campo text del resultado', async () => {
    pdfParse.mockResolvedValueOnce({ text: 'Texto extraído del PDF.' });
    const buffer = Buffer.from('fake-pdf-bytes');
    const result = await extractText(buffer, 'apuntes.pdf');
    expect(pdfParse).toHaveBeenCalledWith(buffer);
    expect(result).toBe('Texto extraído del PDF.');
  });

  it('devuelve string vacío si el PDF no tiene capa de texto (solo imagen)', async () => {
    pdfParse.mockResolvedValueOnce({ text: '' });
    const result = await extractText(Buffer.from(''), 'escaneado.pdf');
    expect(result).toBe('');
  });

  it('devuelve null si pdf-parse lanza una excepción (sin propagar)', async () => {
    pdfParse.mockRejectedValueOnce(new Error('PDF corrupto'));
    const result = await extractText(Buffer.from('bad'), 'roto.pdf');
    expect(result).toBeNull();
  });
});

// ── DOCX ──────────────────────────────────────────────────────────────────

describe('extractText — DOCX', () => {
  it('delega a mammoth.extractRawText y devuelve el campo value', async () => {
    mammoth.extractRawText.mockResolvedValueOnce({
      value:    'Texto extraído del DOCX.',
      messages: [],
    });
    const buffer = Buffer.from('fake-docx-bytes');
    const result = await extractText(buffer, 'informe.docx');
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
    expect(result).toBe('Texto extraído del DOCX.');
  });

  it('devuelve null si mammoth lanza una excepción (sin propagar)', async () => {
    mammoth.extractRawText.mockRejectedValueOnce(new Error('DOCX inválido'));
    const result = await extractText(Buffer.from('bad'), 'roto.docx');
    expect(result).toBeNull();
  });
});

// ── Formato desconocido ───────────────────────────────────────────────────

describe('extractText — formato no soportado', () => {
  it('devuelve null para extensiones no soportadas (.xlsx)', async () => {
    const result = await extractText(Buffer.from('data'), 'hoja.xlsx');
    expect(result).toBeNull();
  });

  it('devuelve null para imágenes (.png)', async () => {
    const result = await extractText(Buffer.from('data'), 'foto.png');
    expect(result).toBeNull();
  });

  it('devuelve null para archivos sin extensión', async () => {
    const result = await extractText(Buffer.from('data'), 'sinextension');
    expect(result).toBeNull();
  });
});

// ── Truncado ─────────────────────────────────────────────────────────────

describe('extractText — truncado', () => {
  it('trunca el texto a 100 000 caracteres y añade la nota de truncado', async () => {
    // Generar un texto de 110 000 caracteres.
    const largeText = 'a'.repeat(110_000);
    const buffer    = Buffer.from(largeText, 'utf-8');

    const result = await extractText(buffer, 'enorme.txt');

    expect(result.length).toBeLessThanOrEqual(100_000 + 100); // margen para la nota
    expect(result).toContain('[...documento truncado por límite de contexto]');
  });

  it('no trunca textos menores a 100 000 caracteres', async () => {
    const text   = 'Texto corto.';
    const buffer = Buffer.from(text, 'utf-8');
    const result = await extractText(buffer, 'corto.txt');
    expect(result).toBe(text);
    expect(result).not.toContain('truncado');
  });
});
