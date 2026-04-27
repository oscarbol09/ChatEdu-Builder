import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // abre el navegador automáticamente al correr `npm run dev`
  },
  build: {
    // 'build' coincide con output_location del workflow de Azure Static Web Apps.
    // Ver: .github/workflows/azure-static-web-apps-*.yml
    outDir: 'build',
  },
});
