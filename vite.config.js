import { defineConfig } from 'vite'

// GitHub Pages: set base to '/<repo>/' for project pages (e.g. '/Zero-Trace/'),
// or '/' for org pages / custom domains. Override via VITE_BASE_URL.
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
