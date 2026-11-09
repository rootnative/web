// Builds the llms files for AI agents:
// - docs/static/llms.txt is written by hand. This script copies it to packages/web/llms.txt, so an
//   agent can read the API of the installed version in node_modules.
// - docs/static/llms-full.txt holds every page of docs/docs, in sidebar order.
// With --check, it writes nothing and fails when a generated file doesn't match. CI runs that.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = join(root, 'docs', 'docs')
const site = 'https://rootnative.github.io/web/'

// sidebars.ts is TypeScript, and Node 22 can't import it without a flag. So read it as text: with
// the imports, types, and labels removed, each quoted string left is a page id.
function readSidebarIds() {
  const source = readFileSync(join(root, 'docs', 'sidebars.ts'), 'utf8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')
    .replace(/\b(?:type|label)\s*:\s*(['"])(?:(?!\1).)*\1/g, '')
  return [...source.matchAll(/(['"])((?:(?!\1).)+)\1/g)].map((match) => match[2])
}

const ids = readSidebarIds()
const pageFiles = readdirSync(pagesDir).filter((file) => /\.mdx?$/.test(file))
const unlisted = pageFiles.filter((file) => !ids.includes(file.replace(/\.mdx?$/, '')))
if (unlisted.length > 0) {
  throw new Error(`Add these pages to docs/sidebars.ts: ${unlisted.join(', ')}`)
}

function pagePath(id) {
  const file = pageFiles.find((name) => name.replace(/\.mdx?$/, '') === id)
  if (!file) throw new Error(`docs/sidebars.ts lists "${id}", but docs/docs has no page for it.`)
  return join(pagesDir, file)
}

const stripFrontMatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '')

// A `:::warning Title` block becomes a quote with a bold label, which keeps its weight as plain text.
const plainAdmonitions = (text) =>
  text.replace(/^:::(\w+)(?:[ \t]+(.*))?\n([\s\S]*?)^:::[ \t]*$/gm, (_, kind, title, body) => {
    const label = title?.trim() ? `${kind.toUpperCase()}: ${title.trim()}` : kind.toUpperCase()
    const lines = body
      .trim()
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
    return [`> **${label}**`, '>', ...lines].join('\n')
  })

// The pages link from the site root, which is /web/ on the site. Out of the site, a link such as
// /installation would point to the wrong place.
const absoluteLinks = (text) => text.replace(/\]\(\/([^)]*)\)/g, (_, path) => `](${site}${path})`)

const renderPage = (id) =>
  absoluteLinks(plainAdmonitions(stripFrontMatter(readFileSync(pagePath(id), 'utf8')))).trim()

function buildFull() {
  const header = [
    '# Root Native Web: full documentation',
    '',
    '> Every page of the docs site, in sidebar order. scripts/build-llms.mjs generates this file',
    "> from docs/docs. Don't edit it by hand.",
    '',
    `Docs: ${site}`,
    'Source: https://github.com/rootnative/web',
  ].join('\n')
  return `${[header, ...ids.map(renderPage)].join('\n\n---\n\n')}\n`
}

const outputs = [
  { path: 'docs/static/llms-full.txt', build: buildFull },
  {
    path: 'packages/web/llms.txt',
    build: () => readFileSync(join(root, 'docs', 'static', 'llms.txt'), 'utf8'),
  },
]

if (process.argv.includes('--check')) {
  const stale = outputs.filter(({ path, build }) => {
    const file = join(root, path)
    return !existsSync(file) || readFileSync(file, 'utf8') !== build()
  })
  for (const { path } of stale) console.error(`${path} doesn't match the docs.`)
  if (stale.length > 0) {
    console.error('Run `pnpm build:llms` and commit the result.')
    process.exitCode = 1
  } else {
    console.log(`The llms files match the docs (${ids.length} pages).`)
  }
} else {
  for (const { path, build } of outputs) writeFileSync(join(root, path), build())
  console.log(`Wrote ${outputs.map(({ path }) => path).join(' and ')} (${ids.length} pages).`)
}
