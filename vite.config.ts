import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Con dominio propio (rawstudio.biz) el sitio se sirve en la raiz del dominio,
// no bajo /rawstudio/. Si esto volviera a '/rawstudio/', todos los assets
// darian 404 en el dominio propio.
export default defineConfig({
  base: '/',
  plugins: [react()],
  // el mp4 del launch debe quedar como archivo aparte, no incrustado en el JS
  build: { assetsInlineLimit: 0 },
})
