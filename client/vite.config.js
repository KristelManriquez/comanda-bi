import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true permite abrir la app desde tu teléfono en la misma red Wi-Fi
    // (Vite muestra la dirección "Network" al iniciar, ej. http://192.168.1.20:5173)
    host: true,
    port: 5173,
  },
})
