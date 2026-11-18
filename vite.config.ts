import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // as semanas inteiras com o jogador de teste passam de 5 s em máquina lenta
    testTimeout: 30000,
  },
});
