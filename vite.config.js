import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves project sites below /<repository>/; local dev stays at /.
  base: process.env.GITHUB_ACTIONS ? '/dune-echoes-of-arrakis/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        }
      }
    },
    chunkSizeWarningLimit: 650
  }
});
