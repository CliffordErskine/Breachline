import { defineConfig } from 'vite';
import path from 'path';

// Vite configuration.  We define an alias for the shared
// directory so that imports like `import { RoomSummary } from
// '@shared/types'` work correctly.  You can customise the dev
// server port here if necessary.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
  },
});