import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// DUO — Vite + React + Tailwind v4. Consome @haile/shared (workspace) e o
// mesmo backend Supabase do Dino.
//
// Deploy: served at /duo/ on haile.com.br (subpath beta privado). `base` faz
// Vite emitir paths absolutos como `/duo/assets/...`. Em dev local, mantém
// `/` pra evitar URLs estranhas (vite ignora `base` quando rodando dev).
export default defineConfig({
  base: '/duo/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5180 },
})
