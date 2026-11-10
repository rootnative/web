// Checks that publishing this version now, to this dist-tag, is what was meant. The code gates
// check the tree; this script checks the release. The release workflow runs it after the bump.
//
//   node scripts/check-release.mjs --version 0.0.0-alpha.1 --dist-tag latest
//
// - npm is new enough for `npm stage publish` with trusted publishing.
// - packages/web/package.json has the version asked for.
// - The tag web@<version> doesn't exist yet. A CI checkout needs `fetch-depth: 0` for this.
// - A prerelease on `latest` doesn't replace a stable release there.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageName = '@rootnative/web'
const minimumNpm = '11.15.0'

const argument = (name) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}
const requested = argument('version')
const distTag = argument('dist-tag')
if (requested === undefined || distTag === undefined) {
  console.error('Usage: node scripts/check-release.mjs --version <x.y.z> --dist-tag <tag>')
  process.exit(2)
}

const problems = []
const warnings = []

const coreNumbers = (version) => version.split('-')[0].split('.').map(Number)

const compareCore = (a, b) => {
  const left = coreNumbers(a)
  const right = coreNumbers(b)
  for (let i = 0; i < 3; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

// An older npm doesn't try trusted publishing: it finds no token and fails with a 404 that names
// neither cause. An npm without `npm stage` fails with an unknown command.
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
if (compareCore(npmVersion, minimumNpm) < 0) {
  problems.push(
    `npm ${npmVersion} can't stage a publish with trusted publishing. Pin npm ${minimumNpm} or later in release-manual.yml.`,
  )
}

const version = JSON.parse(readFileSync(join(root, 'packages/web/package.json'), 'utf8')).version
if (version !== requested) {
  problems.push(`You asked for ${requested}, but packages/web/package.json has ${version}.`)
}

const tag = `web@${version}`
let tagExists = true
try {
  execFileSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
    cwd: root,
    stdio: 'ignore',
  })
} catch {
  tagExists = false
}
if (tagExists) {
  problems.push(
    `The tag ${tag} exists. If ${version} is on npm, bump the version: npm never takes a version twice. ` +
      `If it isn't, an earlier run pushed the tag and then failed to publish. Delete the tag and run again: ` +
      `git push --delete origin ${tag} && git tag -d ${tag}`,
  )
}

// `null`: the package has no `latest` yet. `undefined`: the lookup failed.
const latestOnRegistry = () => {
  try {
    const output = execFileSync('npm', ['view', packageName, 'dist-tags.latest'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return output === '' ? null : output
  } catch (error) {
    return /E404|404 Not Found/.test(`${error.stderr ?? ''}${error.message ?? ''}`)
      ? null
      : undefined
  }
}

// `npm install` resolves `latest`. While no stable version exists, the alpha line belongs there.
// The mistake to stop is a prerelease that replaces a stable release as the default install.
const prerelease = version.includes('-')
if (prerelease && distTag === 'latest') {
  const latest = latestOnRegistry()
  if (latest === undefined) {
    problems.push(
      `${version} is a prerelease for \`latest\`, and the registry lookup failed, so it can't tell if that replaces a stable release. Check the network, or pick alpha.`,
    )
  } else if (latest !== null && !latest.includes('-')) {
    problems.push(
      `${version} is a prerelease and would replace the stable ${latest} on \`latest\`. Pick alpha, beta, or rc.`,
    )
  } else {
    warnings.push(
      `${version} is a prerelease for \`latest\`. That's right while no stable version exists (now: ${latest ?? 'none'}).`,
    )
  }
}
if (!prerelease && distTag !== 'latest') {
  warnings.push(
    `${version} is stable but goes to \`${distTag}\`, so \`npm install ${packageName}\` won't install it.`,
  )
}

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of warnings)
  console.error(`${inActions ? '::warning::' : 'Warning: '}${message}`)
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log(`Ready to release ${version} as ${tag} on \`${distTag}\`, with npm ${npmVersion}.`)
