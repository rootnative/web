// Checks the npm tarball of packages/web against its manifest. Run it after `pnpm build`:
// - each `exports` target is in the tarball, and each JavaScript entry has its .d.ts beside it,
// - package.json, LICENSE, README.md, CHANGELOG.md, and llms.txt are in it,
// - no test file is in it.
// It lists the files with `npm pack --dry-run --ignore-scripts`: the same packer as
// `npm stage publish`, but it builds nothing and writes no tarball.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'web')
const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))

const [packed] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: packageDir,
    encoding: 'utf8',
  }),
)
const files = new Set(packed.files.map((file) => file.path))
const problems = []

for (const [entry, target] of Object.entries(manifest.exports)) {
  if (typeof target !== 'string') {
    problems.push(
      `exports "${entry}" has conditions. Teach scripts/check-artifact.mjs to read them.`,
    )
    continue
  }
  const path = target.replace(/^\.\//, '')
  const types = path.replace(/\.js$/, '.d.ts')
  if (!files.has(path)) {
    problems.push(
      `exports "${entry}" points at ${path}, which isn't in the tarball. Run pnpm build first, or add the entry to tsdown.config.ts.`,
    )
  } else if (path.endsWith('.js') && !files.has(types)) {
    problems.push(`exports "${entry}" has no ${types} in the tarball, so TypeScript gets no types.`)
  }
}

for (const required of ['package.json', 'LICENSE', 'README.md', 'CHANGELOG.md', 'llms.txt']) {
  if (!files.has(required)) {
    problems.push(
      `${required} isn't in the tarball. Add it to "files" in packages/web/package.json.`,
    )
  }
}

const tests = [...files].filter((path) => /\.test\.|__fixtures__\//.test(path))
if (tests.length > 0) problems.push(`The tarball has test files: ${tests.join(', ')}.`)

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log(
  `The tarball of ${manifest.name}@${manifest.version} has ${files.size} files and every export.`,
)
