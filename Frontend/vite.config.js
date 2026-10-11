import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Windows 7 tops out at Chrome/Edge 109, which lacks oklch() and color-mix().
// Have Lightning CSS emit fallbacks for it.
const CHROME_109 = 109 << 16

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: { chrome: CHROME_109 },
    },
  },
  build: {
    target: 'chrome109',
    cssTarget: 'chrome109',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
