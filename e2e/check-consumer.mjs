// Checks the npm tarball as an app uses it. Run it after `pnpm build`:
// - each import in the tarball's JavaScript names a dependency or a peer dependency,
// - the app in ./consumer passes `tsc` with the types of the tarball and no `skipLibCheck`,
// - the app builds with the Vite plugin, and the built page works in Chromium.
// The app follows the Installation page of the docs, so a failure here is also a docs problem.
//
// The tarball goes into ./consumer/node_modules, so the app can't see the source of the package.
// React, Vite, and the dependencies of the tarball resolve from ./node_modules: this workspace
// package lists them, at the versions of the lockfile, so the check needs no second install.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { build, preview } from 'vite'

const e2eDir = dirname(fileURLToPath(import.meta.url))
const appDir = join(e2eDir, 'consumer')
const repoDir = join(e2eDir, '..')
const packageDir = join(repoDir, 'packages', 'web')
const installDir = join(appDir, 'node_modules', '@rootnative', 'web')

const problems = []

function installTarball() {
  const packDir = mkdtempSync(join(tmpdir(), 'rootnative-web-pack-'))
  try {
    execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir], {
      cwd: packageDir,
      stdio: 'ignore',
    })
    const tarball = readdirSync(packDir).find((file) => file.endsWith('.tgz'))
    if (!tarball) throw new Error('npm pack wrote no tarball.')
    rmSync(join(appDir, 'node_modules'), { recursive: true, force: true })
    mkdirSync(installDir, { recursive: true })
    execFileSync('tar', ['-xzf', join(packDir, tarball), '-C', installDir, '--strip-components=1'])
  } finally {
    rmSync(packDir, { recursive: true, force: true })
  }
}

function listScripts(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listScripts(path)
    return entry.name.endsWith('.js') ? [path] : []
  })
}

function checkImports() {
  const manifest = JSON.parse(readFileSync(join(installDir, 'package.json'), 'utf8'))
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ])
  const provided = JSON.parse(readFileSync(join(e2eDir, 'package.json'), 'utf8')).devDependencies
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    if (provided[name] !== version) {
      problems.push(
        `The tarball depends on ${name}@${version}. Set the same version in e2e/package.json, so the app resolves it.`,
      )
    }
  }
  const scripts = listScripts(join(installDir, 'dist'))
  if (scripts.length === 0) {
    throw new Error('The tarball has no dist/*.js. Run pnpm build first.')
  }
  for (const script of scripts) {
    const source = readFileSync(script, 'utf8')
    for (const match of source.matchAll(/\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const specifier = match[1]
      if (specifier.startsWith('.') || specifier.startsWith('node:')) continue
      const name = specifier
        .split('/')
        .slice(0, specifier.startsWith('@') ? 2 : 1)
        .join('/')
      if (builtinModules.includes(name) || declared.has(name)) continue
      problems.push(
        `${script.slice(installDir.length + 1)} imports "${specifier}", but package.json doesn't list "${name}" in dependencies or peerDependencies.`,
      )
    }
  }
}

function checkTypes() {
  try {
    execFileSync(
      join(repoDir, 'node_modules', '.bin', 'tsc'),
      ['-p', join(appDir, 'tsconfig.check.json')],
      { cwd: appDir, encoding: 'utf8', stdio: 'pipe' },
    )
  } catch (error) {
    problems.push(`The app doesn't pass tsc with the types of the tarball:\n${error.stdout}`)
  }
}

async function checkPage() {
  const config = { root: appDir, configFile: join(appDir, 'vite.config.ts'), logLevel: 'warn' }
  await build(config)
  const server = await preview(config)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(10_000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text())
    })
    await page.goto(server.resolvedUrls.local[0])

    const expectEqual = (what, actual, expected) => {
      if (actual !== expected) problems.push(`${what} is "${actual}". It must be "${expected}".`)
    }
    const main = page.locator('main')
    expectEqual('The text of main > h1', await main.locator('h1').textContent(), 'Consumer check')
    const style = await main.evaluate((element) => {
      const computed = getComputedStyle(element)
      return `${computed.display} ${computed.alignItems} ${computed.rowGap}`
    })
    expectEqual('The computed style of main', style, 'flex center 8px')
    expectEqual('Platform.OS', await page.getByTestId('platform').textContent(), 'web')
    expectEqual('__DEV__ in a build', await page.getByTestId('dev').textContent(), 'false')
    expectEqual('The label', await page.getByTestId('label').textContent(), 'web file')
    await page.getByTestId('press').click()
    await page
      .getByText('Pressed 1')
      .waitFor()
      .catch(() => problems.push('A click on the Pressable did not call onPress.'))
    for (const message of errors) problems.push(`The page logged: ${message}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

installTarball()
checkImports()
checkTypes()
await checkPage()

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log('The tarball works in an app: imports, types, the Vite build, and the page.')
