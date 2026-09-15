import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { tnotesData } from './scripts/tnotes-data-plugin'

export default defineConfig({
  base: '/TNotes.root/',
  plugins: [vue(), tnotesData()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 629,
    open: true,
  },
  preview: {
    host: true,
    port: 1629,
  },
})
