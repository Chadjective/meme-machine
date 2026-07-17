import { defineConfig } from 'vite';

// GitHub Pages serves this project under chadjective.github.io/meme-machine,
// so every asset URL must be prefixed with the repo path. This one setting
// drives base-relative URLs in index.html, the manifest, and the service worker
// (which infers its own base from its URL). Locally, dev/preview also serve at
// /meme-machine/ so the paths match production exactly.
export default defineConfig({
  base: '/meme-machine/',
  build: {
    rollupOptions: {
      // Multi-page: the app shell, the generator debug/tuning page, and the
      // standing About/legal page the share cards point at.
      input: {
        main: 'index.html',
        debug: 'debug.html',
        about: 'about.html',
      },
    },
  },
});
