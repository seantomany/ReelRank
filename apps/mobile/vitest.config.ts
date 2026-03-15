import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@reelrank/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
