// Checks that a React Native app with no Expo runs on `@rootnative/web` through Metro. Run it
// after `pnpm build`, which writes the facade of `@rootnative/web-metro`:
// - `rootnative-web build` builds the app in packages/metro-demo for the web, with
//   `react-native bundle` through `withRootNative` of `@rootnative/web-metro`. It writes the page
//   and a bundle with a hashed name,
// - the bundle has no file of the `react-native` package, and a named import of `react-native`
//   loads one file of the facade, not the facade root, which loads all of `@rootnative/web`. It
//   has no dev client either,
// - the page works in Chromium, and loads the image file for the screen,
// - `react-native start` serves the page of `withRootNative` at /index.html, and it works too,
// - on the dev server, an edit of App.js updates the page with Fast Refresh. The check edits the
//   file, and puts it back at the end.

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const e2eDir = dirname(fileURLToPath(import.meta.url))
const repoDir = join(e2eDir, '..')
const appDir = join(repoDir, 'packages', 'metro-demo')
const facadeDir = join(repoDir, 'packages', 'web-metro')
const outDir = join(appDir, 'dist')
const TITLE = 'Root Native Web on Metro'

const problems = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Returns the file name of the bundle, from the page that the build writes.
function buildApp() {
  if (!existsSync(join(facadeDir, 'dist', 'index.js'))) {
    problems.push('packages/web-metro/dist has no index.js. Run `pnpm build` first.')
    return undefined
  }
  try {
    execFileSync('pnpm', ['--filter', '@rootnative/metro-demo', 'build:web'], {
      cwd: repoDir,
      stdio: 'inherit',
    })
  } catch {
    problems.push('rootnative-web build failed. It gives the cause above.')
    return undefined
  }
  const html = readFileSync(join(outDir, 'index.html'), 'utf8')
  if (!html.includes(`<title>${TITLE}</title>`) || !html.includes('<div id="root">')) {
    problems.push('The page of the build has no root, or no title from app.json.')
  }
  const bundle = /<script src="\/(index-[0-9a-f]{12}\.js)"><\/script>/.exec(html)?.[1]
  if (bundle === undefined || !existsSync(join(outDir, bundle))) {
    problems.push('The page of the build has no script of a bundle with a hashed name.')
    return undefined
  }
  if (existsSync(join(outDir, 'index.js'))) {
    problems.push('The build left dist/index.js, the bundle with no hash in its name.')
  }
  return bundle
}

// The files of the bundle, from its source map. Metro writes one section for each module.
function checkSources(bundle) {
  if (!readFileSync(join(outDir, bundle), 'utf8').includes(`//# sourceMappingURL=${bundle}.map`)) {
    problems.push(`${bundle} doesn't point to its source map, ${bundle}.map.`)
  }
  const map = JSON.parse(readFileSync(join(outDir, `${bundle}.map`), 'utf8'))
  const sources = (map.sections ?? [{ map }]).flatMap((section) => section.map.sources)
  const native = sources.filter((source) => /[/\\]node_modules[/\\]react-native[/\\]/.test(source))
  if (native.length > 0) {
    problems.push(
      `The bundle has ${native.length} files of the react-native package, for example ${native[0]}. On the web, withRootNative must resolve no file there.`,
    )
  }
  const facade = sources.filter((source) => /web-metro[/\\]dist[/\\]/.test(source))
  if (!facade.some((source) => /[/\\]exports[/\\]View[/\\]index\.js$/.test(source))) {
    problems.push(
      "The bundle has no exports/View/index.js of the facade: the Babel transformer of web-metro didn't rewrite the import of View.",
    )
  }
  if (facade.some((source) => /web-metro[/\\]dist[/\\]index\.js$/.test(source))) {
    problems.push(
      'The bundle has the root of the facade, which loads all of @rootnative/web. Each named import of react-native in the app must load one file of the facade.',
    )
  }
  const devOnly = sources.filter((source) =>
    /web-metro[/\\]dev-client\.js$|[/\\]react-refresh[/\\]/.test(source),
  )
  if (devOnly.length > 0) {
    problems.push(
      `The production bundle has the dev client: ${devOnly.join(', ')}. In production, __DEV__ is false, and Metro must drop it.`,
    )
  }
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.map': 'application/json',
  '.png': 'image/png',
}

const isFile = (path) => path.startsWith(outDir) && existsSync(path) && statSync(path).isFile()

// A static host for the bundle: the file that the path names, else a 404.
function serve() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
    const file = path === '/' ? join(outDir, 'index.html') : join(outDir, path)
    if (!isFile(file)) {
      response.writeHead(404)
      response.end()
      return
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
    })
    response.end(readFileSync(file))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })
    })
  })
}

async function freePort() {
  const server = createNetServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

// Starts `react-native start` in its own process group, so that one signal stops it and Metro.
async function startDevServer() {
  const port = await freePort()
  const child = spawn(
    join(appDir, 'node_modules', '.bin', 'react-native'),
    ['start', '--port', String(port), '--no-interactive'],
    {
      cwd: appDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Metro has no file watcher when CI is set, as on GitHub Actions, and Fast Refresh needs it.
      env: { ...process.env, CI: 'false' },
    },
  )
  let log = ''
  child.stdout.on('data', (chunk) => (log += chunk))
  child.stderr.on('data', (chunk) => (log += chunk))
  const stop = () => {
    try {
      process.kill(-child.pid)
    } catch {
      // It stopped already.
    }
  }
  const url = `http://localhost:${port}`
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await fetch(`${url}/status`)
      .then((response) => response.text())
      .catch(() => '')
    if (status.includes('packager-status:running')) return { url, stop, output: () => log }
    if (child.exitCode !== null) break
    await sleep(500)
  }
  stop()
  problems.push(`react-native start did not start in 60 s. Its output:\n${log}`)
  return undefined
}

async function checkPage(url, { dev }) {
  const where = dev ? 'On the dev server' : 'In the bundle'
  const browser = await chromium.launch()
  try {
    // A screen with a pixel ratio of 2, so the image loads its @2x file.
    const page = await browser.newPage({ deviceScaleFactor: 2 })
    page.setDefaultTimeout(10_000)
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(String(error)))

    // On a dev server, the first request for the bundle builds it.
    const loaded = await page.goto(url, { timeout: 180_000 }).catch((error) => {
      problems.push(`${where}, the page at ${url} did not load: ${error.message.split('\n')[0]}`)
    })
    if (!loaded) return

    const expectEqual = (what, actual, expected) => {
      if (actual !== expected) {
        problems.push(`${where}, ${what} is "${actual}". It must be "${expected}".`)
      }
    }
    const text = (testID) =>
      page
        .getByTestId(testID)
        .textContent()
        .catch(() => `no element with the testID ${testID}`)

    // The load event comes after the bundle, so a working app renders at once.
    await page
      .locator('h1')
      .waitFor({ timeout: 30_000 })
      .catch(() => problems.push(`${where}, the page rendered no h1.`))
    expectEqual(
      'the text of h1',
      await page
        .locator('h1')
        .textContent({ timeout: 1000 })
        .catch(() => 'no h1'),
      TITLE,
    )
    expectEqual('Platform.OS', await text('platform'), 'Platform.OS is web')

    // `require('./assets/logo.png')` is a Metro asset id, and `Image` builds its srcset.
    const image = await page
      .getByTestId('logo')
      .locator('img')
      .evaluate((img) => img.decode().then(() => new URL(img.currentSrc)))
      .then(({ pathname, search }) => `${pathname}${search.split('&')[0]}`)
      .catch((error) => `not loaded (${error})`)
    expectEqual(
      'the file of the image for a pixel ratio of 2',
      image,
      dev ? '/assets/assets/logo@2x.png?platform=web' : '/assets/assets/logo@2x.png',
    )

    // A press updates the state, and Reanimated moves the box 160 px to the right.
    await page.getByTestId('add').click()
    await page.getByTestId('add').click()
    expectEqual('the count after two presses', await text('count'), '2')
    await page
      .waitForFunction(
        () => {
          const box = document.querySelector('[data-testid="box"]')
          return box !== null && new DOMMatrix(getComputedStyle(box).transform).m41 === 160
        },
        undefined,
        { timeout: 5000 },
      )
      .catch(() => problems.push(`${where}, the Reanimated box did not move 160 px.`))

    for (const message of errors) problems.push(`${where}, the page logged: ${message}`)
  } finally {
    await browser.close()
  }
}

// Fast Refresh: an edit of the label of `Counter` updates the page and keeps the count, with no
// reload. App.js doesn't export `Counter`, so only the React Refresh Babel plugin can keep it.
async function checkFastRefresh(url, output) {
  const appFile = join(appDir, 'App.js')
  const source = readFileSync(appFile, 'utf8')
  const LABEL = '>Add</Text>'
  const refreshed = 'Add one'
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(10_000)
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(url, { timeout: 180_000 })
    await page.locator('h1').waitFor({ timeout: 30_000 })
    await page.getByTestId('add').click()
    await page.evaluate(() => {
      globalThis.loadedBeforeTheEdit = true
    })

    if (!source.includes(LABEL)) {
      problems.push(`App.js has no ${LABEL}, which the check of Fast Refresh edits.`)
      return
    }
    writeFileSync(appFile, source.replace(LABEL, `>${refreshed}</Text>`))
    const updated = await page
      .getByTestId('add')
      .filter({ hasText: refreshed })
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false)
    if (!updated) {
      const tail = output().trim().split('\n').slice(-15).join('\n')
      problems.push(
        `On the dev server, an edit of App.js did not update the page in 30 s. The end of the output of Metro:\n${tail}`,
      )
    } else {
      const count = await page.getByTestId('count').textContent()
      if (count !== '1') {
        problems.push(`After Fast Refresh, the count is "${count}". The state must stay "1".`)
      }
      if (!(await page.evaluate(() => globalThis.loadedBeforeTheEdit === true))) {
        problems.push('The edit of App.js reloaded the page. Fast Refresh must keep it.')
      }
    }
    for (const message of errors) problems.push(`During Fast Refresh, the page logged: ${message}`)
  } finally {
    writeFileSync(appFile, source)
    await browser.close()
  }
}

async function checkDevServer() {
  const server = await startDevServer()
  if (server === undefined) return
  try {
    // `react-native start` answers `/` itself, so the page of withRootNative is at /index.html.
    const html = await fetch(`${server.url}/index.html`).then((response) => response.text())
    if (!html.includes(`<title>${TITLE}</title>`) || !html.includes('<div id="root">')) {
      problems.push(
        'The dev server has no page of withRootNative at /index.html, with the title from app.json.',
      )
    }
    await checkPage(`${server.url}/index.html`, { dev: true })
    await checkFastRefresh(`${server.url}/index.html`, server.output)
  } finally {
    server.stop()
  }
}

// A step that throws adds a problem, so the check still reports each problem that it found.
const guard = (what, step) =>
  step().catch((error) => problems.push(`${what} stopped: ${String(error).split('\n')[0]}`))

const bundle = buildApp()
if (bundle !== undefined) {
  checkSources(bundle)
  const server = await serve()
  try {
    await guard('The check of the bundle', () => checkPage(server.url, { dev: false }))
  } finally {
    server.close()
  }
  await guard('The check of the dev server', checkDevServer)
}

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log(
  'A React Native app with no Expo runs on @rootnative/web through Metro: the bundle, the page, and the dev server.',
)
