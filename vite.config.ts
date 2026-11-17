import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Porta fixa: é a origem liberada no CorsConfig da API.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
