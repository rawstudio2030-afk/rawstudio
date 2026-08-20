import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El sitio vive en github.com/rawstudio2030-afk/rawstudio, o sea que se sirve
// bajo /rawstudio/ y no en la raiz del dominio.
export default defineConfig({
  base: '/rawstudio/',
  plugins: [react()],
  // el mp4 del launch debe quedar como archivo aparte, no incrustado en el JS
  build: { assetsInlineLimit: 0 },
})
