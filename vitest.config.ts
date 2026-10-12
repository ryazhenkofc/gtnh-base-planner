import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    // Layout and routing tests are CPU-heavy: a loaded runner must not turn them red.
    testTimeout: 30_000,
    retry: process.env.CI ? 1 : 0,
  },
});
