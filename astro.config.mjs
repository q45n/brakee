// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://omanconnect.store',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: {
    // Never inline scripts into HTML so the strict `script-src 'self'` CSP in netlify.toml holds.
    build: { assetsInlineLimit: 0 },
  },
});
