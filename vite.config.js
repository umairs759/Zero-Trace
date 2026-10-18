import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Zero-Trace/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
