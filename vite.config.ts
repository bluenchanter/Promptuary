import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  plugins: [
    react(),
    crx({
      manifest: {
        ...manifest,
        background: {
          ...manifest.background,
          type: 'module',
        },
      },
    }),
  ],
})
