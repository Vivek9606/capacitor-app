import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE: the path the web app is served from, e.g. "/capacitor-app/" on GitHub Pages.
// Defaults to "/" (custom domain, Vercel/Netlify, and the Capacitor native build).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', sourcemap: false },
})
