import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The whole monorepo shares one .env at the root.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export default defineConfig({
  server: { port: 4200 },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})
