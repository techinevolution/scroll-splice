import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const companionPort = process.env.SCROLLSPLICE_COMPANION_PORT
const companionToken = process.env.SCROLLSPLICE_COMPANION_TOKEN

export default defineConfig({
  base: './',
  plugins: [react()],
  server: companionPort && companionToken
    ? {
        proxy: {
          '/agent-api': {
            target: `http://127.0.0.1:${companionPort}`,
            headers: {
              'x-scrollsplice-companion-token': companionToken,
            },
          },
        },
      }
    : undefined,
})
