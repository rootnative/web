// Checks the npm tarballs of the three published packages against their manifests. Run it after
// `pnpm build`.
// packages/web:
// - each `exports` target is in the tarball, and each JavaScript entry has its .d.ts beside it,
// - package.json, LICENSE, README.md, CHANGELOG.md, and llms.txt are in it.
// packages/web-expo and packages/web-metro, which both ship the facade of packages/web-metro:
// - each file of the facade is in the tarball, so each name of the list has its file under
//   dist/exports/,
// - package.json, LICENSE, README.md, CHANGELOG.md, the list of names, asset-registry.js, the
//   `main` file, and the files of the package are in it, and nothing from src/, scripts/, or test/,
// - web-metro: each `bin` file is in it,
// - each `@rootnative/web/internal/*.js` file that the facade imports is in the tarball of
//   packages/web. The build of the runtime emits no file for a module that only re-exports, so a
//   path can be in src/ and not in dist/.
// All: no test file.
// It lists the files with `npm pack --dry-run --ignore-scripts`: the same packer as
// `npm stage publish`, but it builds nothing and writes no tarball.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { facadeFiles, SOURCE_FILES } from '../packages/web-metro/scripts/facade.mjs'

const packagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages')
const problems = []
const summaries = []

let webFiles = new Set()

const pack = (name) => {
  const packageDir = join(packagesDir, name)
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
  const [packed] = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: packageDir,
      encoding: 'utf8',
    }),
  )
  const files = new Set(packed.files.map((file) => file.path))
  const tests = [...files].filter((path) => /\.test\.|__fixtures__\//.test(path))
  if (tests.length > 0) problems.push(`The tarball of ${name} has test files: ${tests.join(', ')}.`)
  return { manifest, files }
}

const requireFiles = (name, files, required) => {
  for (const path of required) {
    if (!files.has(path)) {
      problems.push(
        `${path} isn't in the tarball of ${name}. Run pnpm build first, or add it to "files" in packages/${name}/package.json.`,
      )
    }
  }
}

// packages/web
{
  const { manifest, files } = pack('web')
  for (const [entry, target] of Object.entries(manifest.exports)) {
    if (typeof target !== 'string') {
      problems.push(
        `exports "${entry}" has conditions. Teach scripts/check-artifact.mjs to read them.`,
      )
      continue
    }
    const path = target.replace(/^\.\//, '')
    if (path.includes('*')) {
      const [prefix, suffix] = path.split('*')
      if (![...files].some((file) => file.startsWith(prefix) && file.endsWith(suffix))) {
        problems.push(`exports "${entry}" matches no file in the tarball. Run pnpm build first.`)
      }
      continue
    }
    const types = path.replace(/\.js$/, '.d.ts')
    if (!files.has(path)) {
      problems.push(
        `exports "${entry}" points at ${path}, which isn't in the tarball. Run pnpm build first, or add the entry to tsdown.config.ts.`,
      )
    } else if (path.endsWith('.js') && !files.has(types)) {
      problems.push(
        `exports "${entry}" has no ${types} in the tarball, so TypeScript gets no types.`,
      )
    }
  }
  requireFiles('web', files, ['package.json', 'LICENSE', 'README.md', 'CHANGELOG.md', 'llms.txt'])
  webFiles = files
  summaries.push(`${manifest.name}@${manifest.version}: ${files.size} files and every export`)
}

// Each `@rootnative/web/internal/*.js` file that the facade imports.
const facadeImports = () => {
  const sourceTexts = SOURCE_FILES.map((file) =>
    readFileSync(join(packagesDir, 'web-metro', 'src', file), 'utf8'),
  )
  const imported = [...facadeFiles().values(), ...sourceTexts].flatMap((text) =>
    [...text.matchAll(/'@rootnative\/web\/internal\/([^']+)'/g)].map((match) => `dist/${match[1]}`),
  )
  return [...new Set(imported)]
}

// packages/web-expo and packages/web-metro
for (const [name, ownFiles] of [
  ['web-expo', ['expo-exports.json', 'metro.cjs']],
  [
    'web-metro',
    [
      'facade-exports.json',
      'metro.cjs',
      'babel-transformer.cjs',
      'dev-client.js',
      'page.cjs',
      'cli.mjs',
    ],
  ],
]) {
  const { manifest, files } = pack(name)
  const built = [...facadeFiles().keys(), ...SOURCE_FILES].map((path) => `dist/${path}`)
  const bins = Object.values(manifest.bin ?? {}).map((path) => path.replace(/^\.\//, ''))
  requireFiles(name, files, [
    'package.json',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'asset-registry.js',
    manifest.main.replace(/^\.\//, ''),
    ...ownFiles,
    ...bins,
    ...built,
  ])
  const sources = [...files].filter((path) => /^(src|scripts|test)\//.test(path))
  if (sources.length > 0) {
    problems.push(`The tarball of ${name} has files of the repo: ${sources.join(', ')}.`)
  }
  const lost = facadeImports().filter((path) => !webFiles.has(path))
  if (lost.length > 0) {
    problems.push(
      `${name} imports files of @rootnative/web that its tarball doesn't have: ${lost.join(', ')}. Export the name from a module that the build emits.`,
    )
  }
  summaries.push(
    `${manifest.name}@${manifest.version}: ${files.size} files and each built file and each import of the runtime`,
  )
}

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log(`The tarballs have what they need. ${summaries.join('. ')}.`)
