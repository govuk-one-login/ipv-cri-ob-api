export const esbuildMetadata = (entry: string) => ({
  BuildMethod: 'esbuild',
  BuildProperties: {
    Banner: [
      "js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    ],
    EntryPoints: [entry],
    External: ['@aws-sdk/*'],
    Format: 'esm',
    Minify: false,
    OutExtension: ['.js=.mjs'],
    Sourcemap: true,
    Target: 'node24'
  }
})
