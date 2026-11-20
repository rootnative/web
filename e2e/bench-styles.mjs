// Benchmark of the style delivery of `View`. Four variants render the same views:
// - registry: today's `View`. Its registry inserts each new rule into its own style sheets.
// - hybrid: the body of `View`. A server render gives each class as a React 19
//   `<style href precedence>` element. On the client, a registry writes new rules into React's
//   groups, and the view renders no style element.
// - hoisted: the body of `View`, with each class as a `<style href precedence>` element, also on
//   the client.
// - plain: a `<div>` with a fixed class and no style work, as the floor.
// Each sample opens a new page, so it starts with no style rule. The page is ./bench-styles. The
// `hydrate` scenario renders the server HTML in the page, then hydrates it.
//
// CI builds the page in production mode and runs it in the three engines (bench.yml). On the
// Mac, `--url` points at a running dev server of the page. That checks the script, but its
// numbers mean nothing, because React runs in development mode there.
//
// Options: --url <address>, --engines chromium,firefox,webkit, --samples 10, --n 1000.

import { appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { chromium, firefox, webkit } from 'playwright'
import { build, preview } from 'vite'

const browserTypes = { chromium, firefox, webkit }

const appDir = join(dirname(fileURLToPath(import.meta.url)), 'bench-styles')

const { values: options } = parseArgs({
  options: {
    url: { type: 'string' },
    engines: { type: 'string', default: 'chromium,firefox,webkit' },
    samples: { type: 'string', default: '10' },
    n: { type: 'string', default: '1000' },
  },
})

const scenarios = ['mount', 'mount-unique', 'rerender', 'update-new', 'hydrate']
const variants = ['registry', 'hybrid', 'hoisted', 'plain']
const samples = Number(options.samples)
const n = Number(options.n)

// The width of the first view after each scenario. `plain` has no style.
const expectedWidth = {
  mount: '10px',
  'mount-unique': '1000px',
  rerender: '10px',
  'update-new': `${1000 + n}px`,
  hydrate: '10px',
}

const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function runEngine(engine, url) {
  const browser = await browserTypes[engine].launch()
  const times = new Map()
  try {
    for (let sample = 0; sample < samples; sample++) {
      for (const scenario of scenarios) {
        // Each variant takes each place in the order equally often, so a slow moment of the
        // machine doesn't fall on one variant only.
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[(i + sample) % variants.length]
          const page = await browser.newPage()
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text())
          })
          await page.goto(url)
          await page.waitForFunction(() => 'bench' in window)
          const result = await page.evaluate(
            ([s, v, count]) => window.bench.run(s, v, count),
            [scenario, variant, n],
          )
          await page.close()
          if (errors.length > 0) {
            throw new Error(`${engine}, ${scenario}, ${variant}: ${errors.join('; ')}`)
          }
          if (variant !== 'plain' && result.width !== expectedWidth[scenario]) {
            throw new Error(
              `${engine}, ${scenario}, ${variant}: the first view is ${result.width} wide, not ${expectedWidth[scenario]}`,
            )
          }
          const key = `${scenario}/${variant}`
          if (!times.has(key)) times.set(key, { script: [], total: [] })
          times.get(key).script.push(result.script)
          times.get(key).total.push(result.total)
        }
      }
    }
    const version = browser.version()
    return scenarios.flatMap((scenario) =>
      variants.map((variant) => {
        const { script, total } = times.get(`${scenario}/${variant}`)
        return { engine, version, scenario, variant, script: median(script), total: median(total) }
      }),
    )
  } finally {
    await browser.close()
  }
}

const cell = (result) => `${result.script.toFixed(1)} / ${result.total.toFixed(1)}`

function report(results) {
  const lines = [
    `Style delivery: ${n} views, ${samples} samples for each cell.`,
    'Median ms: render and commit / with the style and layout work.',
    '',
    'The last two columns divide the totals.',
    '',
    '| Engine | Scenario | registry | hybrid | hoisted | plain | hybrid ÷ registry | hoisted ÷ registry |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const engine of new Set(results.map((result) => result.engine))) {
    for (const scenario of scenarios) {
      const row = Object.fromEntries(
        results
          .filter((result) => result.engine === engine && result.scenario === scenario)
          .map((result) => [result.variant, result]),
      )
      const ratio = (variant) => (row[variant].total / row.registry.total).toFixed(2)
      lines.push(
        `| ${engine} ${row.registry.version} | ${scenario} | ${cell(row.registry)} | ${cell(row.hybrid)} | ${cell(row.hoisted)} | ${cell(row.plain)} | ${ratio('hybrid')} | ${ratio('hoisted')} |`,
      )
    }
  }
  return lines.join('\n')
}

let server
let url = options.url
if (url === undefined) {
  const config = { root: appDir, configFile: join(appDir, 'vite.config.ts'), logLevel: 'warn' }
  await build(config)
  server = await preview(config)
  url = server.resolvedUrls.local[0]
}

const results = []
try {
  for (const engine of options.engines.split(',')) results.push(...(await runEngine(engine, url)))
} finally {
  await server?.close()
}

const table = report(results)
console.log(table)
if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
  const raw = JSON.stringify(results, null, 2)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `${table}\n\n<details><summary>Medians as JSON</summary>\n\n\`\`\`json\n${raw}\n\`\`\`\n\n</details>\n`,
  )
}
