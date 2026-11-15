// Checks that each file that names the release version agrees with packages/web/package.json:
// - packages/web/CHANGELOG.md has a `## [<version>] - <date>` section, and its link footer has a
//   line for each release up to that version.
// - The Status page names the version in its "The latest release is" line.
// - packages/web-expo has the same version, because the two packages release together.
// - packages/web-expo/CHANGELOG.md has the same section and footer, from its first release on.
//   Before that release, it has only Unreleased. check-release.mjs requires the section in a release.
// - The install line of packages/web-expo/README.md names the version.
// With --fix, it rebuilds the footers, the Status line, and the install line. It never writes a
// release note, so a missing CHANGELOG section always fails. After a fix, run `pnpm build:llms`:
// llms-full.txt copies the Status page.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fix = process.argv.includes('--fix')
const repo = 'https://github.com/rootnative/web'
const tagFor = (version) => `web@${version}`

const read = (path) => readFileSync(join(root, path), 'utf8')
const write = (path, text) => writeFileSync(join(root, path), text)

const version = JSON.parse(read('packages/web/package.json')).version
const problems = []
const fixes = []

// Compares two versions in the order of semver: the numbers, then the prerelease parts.
const compareVersions = (a, b) => {
  const [aCore, aPre] = a.split(/-(.*)/s)
  const [bCore, bPre] = b.split(/-(.*)/s)
  const aNumbers = aCore.split('.').map(Number)
  const bNumbers = bCore.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (aNumbers[i] !== bNumbers[i]) return aNumbers[i] - bNumbers[i]
  }
  if (aPre === undefined || bPre === undefined) return (aPre === undefined) - (bPre === undefined)
  const aParts = aPre.split('.')
  const bParts = bPre.split('.')
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    if (aParts[i] === undefined || bParts[i] === undefined) return aParts[i] === undefined ? -1 : 1
    const aNumber = /^\d+$/.test(aParts[i])
    const bNumber = /^\d+$/.test(bParts[i])
    if (aNumber && bNumber && Number(aParts[i]) !== Number(bParts[i])) {
      return Number(aParts[i]) - Number(bParts[i])
    }
    if (aNumber !== bNumber) return aNumber ? -1 : 1
    if (aParts[i] !== bParts[i]) return aParts[i] < bParts[i] ? -1 : 1
  }
  return 0
}

// `firstReleasePending`: a package that has no release up to this version yet needs no section.
const checkChangelog = (changelogPath, { firstReleasePending }) => {
  const changelog = read(changelogPath)
  const headings = [...changelog.matchAll(/^## \[(\d[^\]]*)\](.*)$/gm)].map((match) => ({
    version: match[1],
    dated: /^ - \d{4}-\d{2}-\d{2}$/.test(match[2]),
  }))
  // A section above the current version is the note of the next release. Its tag doesn't exist
  // yet, so the footer links it only after the release bumps the version.
  const released = headings.filter((heading) => compareVersions(heading.version, version) <= 0)
  const current = released.find((heading) => heading.version === version)

  if (current === undefined && !(firstReleasePending && released.length === 0)) {
    problems.push(
      `${changelogPath} has no "## [${version}] - <date>" section. Write the release note first.`,
    )
    return
  }
  if (current !== undefined && !current.dated) {
    problems.push(`${changelogPath}: give "## [${version}]" its date, as "- YYYY-MM-DD".`)
  }

  const footer = [
    `[unreleased]: ${repo}/compare/${tagFor(version)}...HEAD`,
    ...released.map(
      (heading) => `[${heading.version}]: ${repo}/releases/tag/${tagFor(heading.version)}`,
    ),
  ].join('\n')

  const lines = changelog.trimEnd().split('\n')
  let start = lines.length
  while (start > 0 && /^\[[^\]]+\]: /.test(lines[start - 1])) start -= 1
  const body = lines.slice(0, start).join('\n').trimEnd()

  if (lines.slice(start).join('\n') !== footer) {
    if (fix) {
      write(changelogPath, `${body}\n\n${footer}\n`)
      fixes.push(`${changelogPath}: rebuilt the link footer.`)
    } else {
      problems.push(
        `${changelogPath}: the link footer is out of date. Run pnpm check:versions:fix.`,
      )
    }
  }
}

checkChangelog('packages/web/CHANGELOG.md', { firstReleasePending: false })

const expoVersion = JSON.parse(read('packages/web-expo/package.json')).version
if (expoVersion !== version) {
  problems.push(
    `packages/web-expo/package.json has ${expoVersion}, and packages/web/package.json has ${version}. The two packages release together at one version.`,
  )
}
checkChangelog('packages/web-expo/CHANGELOG.md', { firstReleasePending: true })

const readmePath = 'packages/web-expo/README.md'
const readme = read(readmePath)
const installLine = /("react-native-web": "npm:@rootnative\/web-expo@)([^"]+)(")/
const installed = readme.match(installLine)

if (installed === null) {
  problems.push(
    `${readmePath} has no "react-native-web": "npm:@rootnative/web-expo@x.y.z" line. Keep that shape, or change this script with it.`,
  )
} else if (installed[2] !== version) {
  if (fix) {
    write(readmePath, readme.replace(installLine, `$1${version}$3`))
    fixes.push(`${readmePath}: ${installed[2]} → ${version}.`)
  } else {
    problems.push(
      `${readmePath} installs ${installed[2]}, not ${version}. Run pnpm check:versions:fix.`,
    )
  }
}

const statusPath = 'docs/docs/status.md'
const status = read(statusPath)
const statusLine = /^(The latest release is \[`)([^`]+)(`\])/m
const named = status.match(statusLine)

if (named === null) {
  problems.push(
    `${statusPath} has no "The latest release is [\`x.y.z\`]" line. Keep that shape, or change this script with it.`,
  )
} else if (named[2] !== version) {
  if (fix) {
    write(statusPath, status.replace(statusLine, `$1${version}$3`))
    fixes.push(`${statusPath}: ${named[2]} → ${version}.`)
  } else {
    problems.push(
      `${statusPath} names ${named[2]}, not ${version}. Run pnpm check:versions:fix, then pnpm build:llms.`,
    )
  }
}

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of fixes) console.log(`Fixed ${message}`)
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log(`The version references match ${version} (tag ${tagFor(version)}).`)
