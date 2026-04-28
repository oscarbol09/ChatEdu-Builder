/**
 * @fileoverview Setup global de Vitest para tests del frontend.
 *
 * Se ejecuta ANTES de cada archivo de test gracias a `setupFiles` en vite.config.js.
 * Importa los matchers extendidos de @testing-library/jest-dom para que
 * `expect(element).toBeInTheDocument()` y similares funcionen sin imports
 * adicionales en cada test.
 */
import '@testing-library/jest-dom';
