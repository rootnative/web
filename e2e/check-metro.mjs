// Checks that a React Native app with no Expo runs on `@rootnative/web` through Metro. Run it
// after `pnpm build`, which writes the facade of `@rootnative/web-metro`:
// - the app in packages/metro-demo bundles for the web with `react-native bundle`, through
//   `withRootNative` of `@rootnative/web-metro`,
// - the bundle has no file of the `react-native` package, and a named import of `react-native`
//   loads one file of the facade, not the facade root, which loads all of `@rootnative/web`,
// - the page works in Chromium, and loads the image file for the screen,
// - `react-native start` serves the page of `withRootNative` at /index.html, and it works too.

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
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

function bundleApp() {
  if (!existsSync(join(facadeDir, 'dist', 'index.js'))) {
    problems.push('packages/web-metro/dist has no index.js. Run `pnpm build` first.')
    return false
  }
  rmSync(outDir, { recursive: true, force: true })
  try {
    execFileSync('pnpm', ['--filter', '@rootnative/metro-demo', 'bundle:web'], {
      cwd: repoDir,
      stdio: 'inherit',
    })
    return true
  } catch {
    problems.push('react-native bundle --platform web failed. Metro gives the cause above.')
    return false
  }
}

// The files of the bundle, from its source map. Metro writes one section for each module.
function checkSources() {
  const map = JSON.parse(readFileSync(join(outDir, 'index.js.map'), 'utf8'))
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
}

// `react-native bundle` writes no HTML, so the check writes the page.
function writePage() {
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${TITLE}</title>
    <style>
      html, body, #root { height: 100%; margin: 0 }
      #root { display: flex; flex-direction: column }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="/index.js"></script>
  </body>
</html>
`,
  )
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
    { cwd: appDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
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
    if (status.includes('packager-status:running')) return { url, stop }
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
  } finally {
    server.stop()
  }
}

// A step that throws adds a problem, so the check still reports each problem that it found.
const guard = (what, step) =>
  step().catch((error) => problems.push(`${what} stopped: ${String(error).split('\n')[0]}`))

if (bundleApp()) {
  checkSources()
  writePage()
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
