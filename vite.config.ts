import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// Standalone test pages for e2e/renderer.spec.ts and e2e/detailed.spec.ts. Built only for e2e runs
// (Playwright sets E2E_HARNESS=1) so they are never deployed.
const harnesses: Record<string, string> = process.env.E2E_HARNESS
  ? {
      'renderer-harness': page('./renderer-harness.html'),
      detailedHarness: page('./detailed-harness.html'),
    }
  : {};

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    // three.js alone is ~550 kB minified.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      input: { main: page('./index.html'), ...harnesses },
    },
  },
});
