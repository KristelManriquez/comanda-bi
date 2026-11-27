import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    // Las pruebas comparten una base de datos: se ejecutan en orden, un archivo a la vez
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
