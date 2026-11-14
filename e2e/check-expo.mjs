// Checks that an Expo app runs on `@rootnative/web`. Run it after `pnpm build`:
// - each name that Expo's bundler rewrites to a file of react-native-web is in the list of
//   `@rootnative/web-expo`, so a new Expo release can't add a path with no file,
// - the app in packages/expo-demo exports for the web with Expo,
// - the exported page works in Chromium, and the runtime of the page is `@rootnative/web`.
//
// The app installs `@rootnative/web-expo` under the name `react-native-web`, as the README of that
// package says. With `--url <address>`, the check uses a running `expo start` and exports nothing.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const e2eDir = dirname(fileURLToPath(import.meta.url))
const repoDir = join(e2eDir, '..')
const appDir = join(repoDir, 'packages', 'expo-demo')
const facadeDir = join(repoDir, 'packages', 'web-expo')
const outDir = join(appDir, 'dist')

const urlFlag = process.argv.indexOf('--url')
const runningUrl = urlFlag === -1 ? undefined : process.argv[urlFlag + 1]

const problems = []

// The list is in the Metro transform of Expo. Its package is a dependency of `expo`, so it
// resolves from there.
function checkNames() {
  const fromApp = createRequire(join(appDir, 'package.json'))
  const fromExpo = createRequire(fromApp.resolve('expo/package.json'))
  const pluginPath = join(
    dirname(fromExpo.resolve('@expo/metro-config/package.json')),
    'build/transform-worker/noxcturnal/plugins/react-native-web.js',
  )
  if (!existsSync(pluginPath)) {
    problems.push(
      `Expo has no ${pluginPath}. The file with the react-native-web names moved: find it, and change this check.`,
    )
    return
  }
  const source = readFileSync(pluginPath, 'utf8')
  const list = source.slice(source.indexOf('new Set(['), source.indexOf('])'))
  const expoNames = [...list.matchAll(/'([\w$]+)'/g)].map((match) => match[1])
  if (expoNames.length === 0) {
    problems.push(`No name found in ${pluginPath}. Its format changed: change this check.`)
    return
  }
  const { names } = JSON.parse(readFileSync(join(facadeDir, 'expo-exports.json'), 'utf8'))
  const known = new Set(names)
  for (const name of expoNames) {
    if (!known.has(name)) {
      problems.push(
        `Expo rewrites "${name}" to react-native-web/dist/exports/${name}, and packages/web-expo/expo-exports.json doesn't have it. Add it to "names", and to "missing" if @rootnative/web has no such export.`,
      )
    }
  }
}

function exportApp() {
  execFileSync('pnpm', ['--filter', '@rootnative/expo-demo', 'export'], {
    cwd: repoDir,
    stdio: 'inherit',
  })
}

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
}

// A static host for a single-page export: a file when the path names one, else index.html.
function serve() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
    const candidate = join(outDir, path)
    const file =
      candidate.startsWith(outDir) && existsSync(candidate) && statSync(candidate).isFile()
        ? candidate
        : join(outDir, 'index.html')
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

async function checkPage(url) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(10_000)
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(String(error)))
    // The first request to a dev server starts the bundle.
    const loaded = await page.goto(url, { timeout: 180_000 }).catch((error) => {
      problems.push(`The page at ${url} did not load: ${error.message.split('\n')[0]}`)
    })
    if (!loaded) return

    const expectEqual = (what, actual, expected) => {
      if (actual !== expected) problems.push(`${what} is "${actual}". It must be "${expected}".`)
    }
    const text = (testID) =>
      page
        .getByTestId(testID)
        .textContent()
        .catch(() => `no element with the testID ${testID}`)

    await page
      .locator('h1')
      .waitFor()
      .catch(() => problems.push('The page rendered no h1.'))
    expectEqual('The text of h1', await page.locator('h1').textContent(), 'Root Native Web on Expo')
    expectEqual('Platform.OS', await text('platform'), 'Platform.OS is web')

    // react-native-web has one style sheet. `@rootnative/web` has three, with these ids.
    const sheets = await page.evaluate(() =>
      ['reset', 'shorthand', 'longhand'].filter(
        (name) => document.getElementById(`rootnative-style-${name}`) !== null,
      ),
    )
    expectEqual('The style sheets of @rootnative/web', sheets.join(' '), 'reset shorthand longhand')

    // An image import: Expo gives it a URL, and `Image` loads it.
    const imageWidth = await page
      .getByTestId('logo')
      .locator('img')
      .evaluate((image) => image.decode().then(() => image.naturalWidth))
      .catch((error) => `not loaded (${error})`)
    expectEqual('The natural width of the imported image', String(imageWidth), '180')

    await page.getByTestId('add').click()
    await page.getByTestId('add').click()
    expectEqual('The count after two presses', await text('count'), '2')
    await page.getByTestId('name').fill('Ada')
    expectEqual('The greeting after the text input', await text('greeting'), 'Hello, Ada.')

    // Reanimated, and a library that is built on it, each move a box 160 px to the right.
    await page.getByTestId('move').click()
    for (const testID of ['reanimated', 'inertia']) {
      await page
        .waitForFunction(
          (id) => {
            const box = document.querySelector(`[data-testid="${id}"]`)
            return box !== null && new DOMMatrix(getComputedStyle(box).transform).m41 === 160
          },
          testID,
          { timeout: 5000 },
        )
        .catch(() => problems.push(`The ${testID} box did not move 160 px after the press.`))
    }

    // `@rootnative/components`, with the pointer and the keyboard.
    await page.getByTestId('save').click()
    expectEqual('The count of the components Button', await text('saves'), '1')
    await page.getByTestId('switch').click()
    expectEqual('The components Switch', await text('on'), 'on')
    await page.getByTestId('checkbox').click()
    expectEqual('The components Checkbox', await text('checked'), 'checked')
    await page.getByTestId('email').fill('a@b.c')
    expectEqual('The text of the components TextField', await text('typed'), 'a@b.c')
    const slider = await page.getByTestId('slider').boundingBox()
    if (slider === null) {
      problems.push('The components Slider has no box.')
    } else {
      const y = slider.y + slider.height / 2
      await page.mouse.move(slider.x + slider.width * 0.3, y)
      await page.mouse.down()
      await page.mouse.move(slider.x + slider.width * 0.7, y, { steps: 8 })
      await page.mouse.up()
      expectEqual('The components Slider after a drag from 30 to 70', await text('volume'), '70')
    }
    expectEqual(
      'The count of svg elements (CircularProgress)',
      String(await page.locator('svg').count()),
      '1',
    )

    for (const message of errors) problems.push(`The page logged: ${message}`)
  } finally {
    await browser.close()
  }
}

checkNames()
if (runningUrl === undefined) {
  exportApp()
  const server = await serve()
  try {
    await checkPage(server.url)
  } finally {
    server.close()
  }
} else {
  await checkPage(runningUrl)
}

const inActions = process.env.GITHUB_ACTIONS === 'true'
for (const message of problems) console.error(`${inActions ? '::error::' : 'Error: '}${message}`)

if (problems.length > 0) process.exit(1)
console.log('An Expo app runs on @rootnative/web: the names, the export, and the page.')
