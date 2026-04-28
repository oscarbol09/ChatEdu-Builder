import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // abre el navegador automáticamente al correr `npm run dev`
    proxy: {
      // Redirige todas las llamadas a /api/* hacia la Azure Function App local.
      // Prerequisito: ejecutar `func start` en la carpeta /api antes de `npm run dev`.
      '/api': {
        target:       'http://localhost:7071',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
  build: {
    // 'build' coincide con output_location del workflow de Azure Static Web Apps.
    // Ver: .github/workflows/azure-static-web-apps-*.yml
    outDir: 'build',
  },
});
