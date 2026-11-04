import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Con dominio propio (rawstudio.biz) el sitio se sirve en la raiz del dominio,
// no bajo /rawstudio/. Si esto volviera a '/rawstudio/', todos los assets
// darian 404 en el dominio propio.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // el mp4 del launch debe quedar como archivo aparte, no incrustado en el JS
    assetsInlineLimit: 0,

    // Sin esto el troceado esta APAGADO y todo acaba en un solo archivo.
    // Importaba mas de lo que parece: `lib/admin.ts` ya usaba `await import()`
    // en tres sitios y no partia nada, asi que el panel entero viajaba en el
    // mismo paquete que abre cualquiera que entre a la portada. Con el
    // troceado encendido, el `lazy()` de App.tsx por fin significa algo.
    //
    // No hace falta agrupar los trozos a mano. Se intento, y salio al reves:
    // un grupo por ruta se traga tambien las dependencias de esos modulos
    // —React, supabase— y entonces el paquete principal tiene que pedirselas
    // al trozo del panel, con lo que vuelve a descargarse siempre. Lo que de
    // verdad ataba el panel al tronco era un unico import.
    rolldownOptions: { output: { codeSplitting: true } },
  },
})
