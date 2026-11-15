// Writes the version of each workspace package into the dependencies of one package, in place of
// pnpm's `workspace:` range. `npm stage publish` packs package.json as it is, and no install can
// resolve `workspace:*`. The release runs this after the release commit, so the change is never
// committed.
//
//   node scripts/pin-workspace-deps.mjs packages/web-expo
//
// As `pnpm publish` does: `workspace:*` becomes the exact version, `workspace:^` and
// `workspace:~` get that prefix, and any other range loses the `workspace:` prefix only.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
if (target === undefined) {
  console.error('Usage: node scripts/pin-workspace-deps.mjs <package directory>')
  process.exit(2)
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const versions = new Map()
for (const name of readdirSync(join(root, 'packages'), { withFileTypes: true })) {
  if (!name.isDirectory()) continue
  try {
    const manifest = readJson(join(root, 'packages', name.name, 'package.json'))
    versions.set(manifest.name, manifest.version)
  } catch {
    // A folder with no package.json isn't a workspace package.
  }
}

const manifestPath = join(root, target, 'package.json')
const manifest = readJson(manifestPath)
const problems = []
const pinned = []

for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
    if (!spec.startsWith('workspace:')) continue
    const range = spec.slice('workspace:'.length)
    const version = versions.get(name)
    if (version === undefined) {
      problems.push(`${field}.${name} is "${spec}", and no package in packages/ has that name.`)
      continue
    }
    const exact = range === '*' || range === '' ? version : null
    const prefixed = range === '^' || range === '~' ? `${range}${version}` : null
    manifest[field][name] = exact ?? prefixed ?? range
    pinned.push(`${field}.${name}: ${spec} → ${manifest[field][name]}`)
  }
}

const text = `${JSON.stringify(manifest, null, 2)}\n`
if (text.includes('"workspace:'))
  problems.push(`${target}/package.json still has a workspace: range.`)

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)
if (problems.length > 0) process.exit(1)

writeFileSync(manifestPath, text)
for (const line of pinned) console.log(`Pinned ${line}`)
if (pinned.length === 0) console.log(`${target}/package.json has no workspace: range.`)
