/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { handleApi, type ResponseCache } from './worker/api'

/**
 * No `npm run dev` não há Worker: este plugin responde /api/* com o mesmo código dele, usando as chaves do
 * .env.local (TMDB_TOKEN e OMDB_KEY; aceita também os nomes que os scripts já usam). Elas ficam só no servidor local.
 */
function devApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const keys = {
    TMDB_TOKEN: env.TMDB_TOKEN || env.VITE_TMDB_API_TOKEN, // o segundo nome é o antigo
    OMDB_KEY: env.OMDB_KEY || env.OMDB_SCRIPT_KEY,
  }
  const store = new Map<string, Response>()
  const cache: ResponseCache = {
    match: async (request) => store.get(request.url)?.clone(),
    put: async (request, response) => void store.set(request.url, response),
  }
  return {
    name: 'cinera-dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const response = await handleApi(new Request(`http://localhost${req.originalUrl}`), keys, cache)
        res.statusCode = response.status
        response.headers.forEach((value, name) => res.setHeader(name, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(mode)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
  },
  test: {
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
  },
}))