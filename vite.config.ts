import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const handlerDir = resolve(import.meta.dirname, 'src/handler')
const entries = Object.fromEntries(
  readdirSync(handlerDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => [file.replace('.ts', ''), resolve(handlerDir, file)])
)

export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['es']
    },
    minify: false,
    outDir: 'dist',
    rollupOptions: {
      // Exclude AWS SDK, Node.js built-ins, and Powertools - already available in Lambda runtime
      external: [/^@aws-sdk\/.*/, /^node:.*/, /^@aws-lambda-powertools\/.*/],
      output: {
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        entryFileNames: '[name].mjs',
        manualChunks: undefined
      }
    },
    sourcemap: true,
    target: 'node24'
  },
  resolve: {
    alias: {
      '@src': resolve(import.meta.dirname, 'src')
    }
  }
})
