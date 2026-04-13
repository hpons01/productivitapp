import { resolve } from 'path'
import { builtinModules } from 'module'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const externalBuiltins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)])

function isMainExternal(id: string): boolean {
  if (id.startsWith('\0')) return false
  if (externalBuiltins.has(id)) return true
  // Externalize package imports in main process to avoid bundling native deps.
  return !id.startsWith('.') && !id.startsWith('/')
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        include: ['better-sqlite3', 'bindings']
      })
    ],
    build: {
      rollupOptions: {
        external: isMainExternal,
        output: {
          format: 'cjs'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: []
      }
    }
  }
})
