import { defineConfig } from 'oxfmt'

export default defineConfig({
  trailingComma: 'none',
  endOfLine: 'lf',
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  semi: false,
  printWidth: 100,
  sortPackageJson: false,
  ignorePatterns: ['*.md', 'dist', 'deploy', 'node_modules']
})
