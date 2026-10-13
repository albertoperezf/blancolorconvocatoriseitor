import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
    // Argon2 + PGlite boot make DB tests slower than the default 5 s.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: { include: ['src/lib/**', 'src/components/status-selector.tsx'] },
  },
});
