import { build } from 'esbuild'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
// Mark all node_modules deps as external EXCEPT workspace packages (shared)
const external = [
  ...Object.keys(pkg.dependencies ?? {}).filter((d) => d !== 'shared'),
  ...Object.keys(pkg.devDependencies ?? {}),
]

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  external,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
})
