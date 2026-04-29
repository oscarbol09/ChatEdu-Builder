import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target:       'http://localhost:7071',
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  build: {
    outDir: 'build',
  },

  // ── Configuración de Vitest ──────────────────────────────────────────────
  test: {
    // jsdom simula el DOM del navegador (necesario para hooks y componentes React).
    environment: 'jsdom',

    // Importar los matchers de @testing-library/jest-dom en todos los tests
    // (toBeInTheDocument, toHaveTextContent, etc.) sin necesidad de importarlos
    // manualmente en cada archivo.
    setupFiles: ['./src/test/setup.js'],

    // Permite usar describe/it/expect sin imports explícitos en cada test.
    globals: true,

    // Alias para tests
    alias: {
      '@': resolve(__dirname, './src'),
    },

    // Excluir node_modules y la carpeta de tests del backend (tienen su propia config).
    exclude: ['node_modules', 'api/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include:  ['src/**/*.{js,jsx}'],
      exclude:  ['src/test/**', 'src/main.jsx'],
    },
  },
});
