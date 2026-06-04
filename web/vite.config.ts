import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// DUO — Vite + React + Tailwind v4. Consome @haile/shared (workspace) e o
// mesmo backend Supabase do Dino.
//
// Deploy: served at /app/ on haile.com.br. Substituiu o Dino (vanilla) que
// ficou arquivado em /app-dino-backup/. `base` faz Vite emitir paths absolutos
// como `/app/assets/...`. Em dev local, vite ignora `base` automaticamente.
export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5180 },
})
