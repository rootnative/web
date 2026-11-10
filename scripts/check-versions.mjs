// Checks that each file that names the release version agrees with packages/web/package.json:
// - packages/web/CHANGELOG.md has a `## [<version>] - <date>` section, and its link footer has a
//   line for each release up to that version.
// - The Status page names the version in its "The latest release is" line.
// With --fix, it rebuilds the footer and the Status line. It never writes a release note, so a
// missing CHANGELOG section always fails. After a fix, run `pnpm build:llms`: llms-full.txt copies
// the Status page.

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

const changelogPath = 'packages/web/CHANGELOG.md'
const changelog = read(changelogPath)
const headings = [...changelog.matchAll(/^## \[(\d[^\]]*)\](.*)$/gm)].map((match) => ({
  version: match[1],
  dated: /^ - \d{4}-\d{2}-\d{2}$/.test(match[2]),
}))
const index = headings.findIndex((heading) => heading.version === version)

if (index === -1) {
  problems.push(
    `${changelogPath} has no "## [${version}] - <date>" section. Write the release note first.`,
  )
} else {
  if (!headings[index].dated) {
    problems.push(`${changelogPath}: give "## [${version}]" its date, as "- YYYY-MM-DD".`)
  }

  // A section above the current version is the note of the next release. Its tag doesn't exist
  // yet, so the footer links it only after the release bumps the version.
  const released = headings.slice(index).map((heading) => heading.version)
  const footer = [
    `[unreleased]: ${repo}/compare/${tagFor(version)}...HEAD`,
    ...released.map((entry) => `[${entry}]: ${repo}/releases/tag/${tagFor(entry)}`),
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
