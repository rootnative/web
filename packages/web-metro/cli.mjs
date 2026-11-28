// `rootnative-web build`: the production web build of a React Native app with no Expo. It runs
// `react-native bundle --platform web` with the Metro config of the app, which uses
// `withRootNative`. Then it gives the bundle a name with the hash of its content, and writes the
// page. `react-native bundle` writes the images where the bundle looks for them.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const require = createRequire(import.meta.url)
const { appTitle, pageHTML } = require('./page.cjs')

export const USAGE = `Usage: rootnative-web build [options]

Builds the web app for production, with the Metro config of the app.

Options:
  --entry-file <file>  The entry of the web app. Default: index.web.js, else index.js.
  --output-dir <dir>   The folder of the build. Default: dist.
  --sourcemap          Also write a source map.
  --reset-cache        Clear the cache of Metro first.
  --help               Show this text.
`

class UsageError extends Error {}

export const parseOptions = (argv, projectRoot, exists = existsSync) => {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'entry-file': { type: 'string' },
        'output-dir': { type: 'string' },
        sourcemap: { type: 'boolean', default: false },
        'reset-cache': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
    })
  } catch (error) {
    throw new UsageError(error.message)
  }
  const { values, positionals } = parsed
  if (values.help) return { help: true }
  if (positionals.length !== 1 || positionals[0] !== 'build') {
    throw new UsageError(`Unknown command: ${positionals.join(' ') || '(none)'}.`)
  }
  const outputDir = resolve(projectRoot, values['output-dir'] ?? 'dist')
  // The build empties the folder first, so it can't be the app or a folder that holds it.
  if (!relative(outputDir, projectRoot).startsWith('..')) {
    throw new UsageError(`The output folder ${outputDir} holds the app. Pick a folder in it.`)
  }
  return {
    help: false,
    entryFile:
      values['entry-file'] ??
      (exists(join(projectRoot, 'index.web.js')) ? 'index.web.js' : 'index.js'),
    outputDir,
    sourcemap: values.sourcemap,
    resetCache: values['reset-cache'],
  }
}

// The hash of the content, so a browser can keep the file in its cache until it changes.
export const hashedName = (code) =>
  `index-${createHash('sha256').update(code).digest('hex').slice(0, 12)}.js`

// The page of the app, when it has an `index.html`: the one that the dev server serves. Its
// script of the dev bundle loads the build.
export const pageFromTemplate = (html, bundle) => {
  const script = /(<script\b[^>]*\bsrc=)(["'])\/index\.bundle\?[^"']*\2/
  if (!script.test(html)) {
    throw new Error(
      'The index.html of the app has no <script src="/index.bundle?..."> of the dev bundle, so the build has no place for its bundle.',
    )
  }
  return html.replace(script, `$1$2${bundle}$2`)
}

const countFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
        .length
    : 0

// The React Native CLI of the app, from the `bin` of its `react-native` package.
const reactNativeCLI = (projectRoot) => {
  const manifest = require.resolve('react-native/package.json', { paths: [projectRoot] })
  const { bin } = JSON.parse(readFileSync(manifest, 'utf8'))
  return join(dirname(manifest), typeof bin === 'string' ? bin : bin['react-native'])
}

const build = (options, projectRoot) => {
  const { entryFile, outputDir, sourcemap, resetCache } = options
  rmSync(outputDir, { recursive: true, force: true })
  const bundleFile = join(outputDir, 'index.js')
  const mapFile = `${bundleFile}.map`
  const args = [
    reactNativeCLI(projectRoot),
    'bundle',
    '--platform',
    'web',
    '--dev',
    'false',
    '--entry-file',
    entryFile,
    '--bundle-output',
    bundleFile,
    '--assets-dest',
    outputDir,
    ...(sourcemap ? ['--sourcemap-output', mapFile] : []),
    ...(resetCache ? ['--reset-cache'] : []),
  ]
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error('react-native bundle failed. Metro gives the cause above.')

  const code = readFileSync(bundleFile, 'utf8')
  const name = hashedName(code)
  if (sourcemap) {
    renameSync(mapFile, join(outputDir, `${name}.map`))
    writeFileSync(
      join(outputDir, name),
      code.replace(
        /\/\/# sourceMappingURL=index\.js\.map\s*$/,
        `//# sourceMappingURL=${name}.map\n`,
      ),
    )
    rmSync(bundleFile)
  } else {
    renameSync(bundleFile, join(outputDir, name))
  }

  const template = join(projectRoot, 'index.html')
  const html = existsSync(template)
    ? pageFromTemplate(readFileSync(template, 'utf8'), `/${name}`)
    : pageHTML(appTitle(projectRoot), `/${name}`)
  writeFileSync(join(outputDir, 'index.html'), html)

  const assetCount = countFiles(join(outputDir, 'assets'))
  const where = relative(projectRoot, outputDir) || '.'
  console.log(`Wrote ${where}/index.html, ${where}/${name}, and ${assetCount} asset files.`)
}

export const main = (argv, projectRoot) => {
  try {
    const options = parseOptions(argv, projectRoot)
    if (options.help) {
      console.log(USAGE)
      return 0
    }
    build(options, projectRoot)
    return 0
  } catch (error) {
    console.error(`rootnative-web: ${error.message}`)
    if (error instanceof UsageError) console.error(`\n${USAGE}`)
    return 1
  }
}
