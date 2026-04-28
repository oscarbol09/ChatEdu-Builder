import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node puro: sin DOM, sin jsdom. Los tests del backend son lógica pura.
    environment: 'node',
    globals:     true,
    include:     ['src/test/**/*.test.js'],
  },
});
