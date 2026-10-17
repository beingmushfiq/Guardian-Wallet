import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    server: {
      deps: {
        // node:sqlite is newer than Vite's builtin list; keep it external.
        external: [/^node:sqlite$/],
      },
    },
  },
});
