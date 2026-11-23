// Writes `dist/`, with the file layout of react-native-web. Expo's Metro transform rewrites
// `import { View } from 'react-native'` to `react-native-web/dist/exports/View` on the web, and
// each other import to `react-native-web/dist/index`. `withRootNative` in the Metro config of the
// app, or an install under the name `react-native-web`, sends those paths to this package.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeSource = join(packageDir, '..', 'web', 'src')

export const readExports = () =>
  JSON.parse(readFileSync(join(packageDir, 'expo-exports.json'), 'utf8'))

// `./components/View` is the file `components/View/index.tsx`. Another path can be a file.
const moduleFile = (path) => {
  for (const candidate of [path, `${path}/index`]) {
    if (['.ts', '.tsx'].some((ext) => existsSync(join(runtimeSource, candidate + ext)))) {
      return candidate
    }
  }
  throw new Error(`@rootnative/web has no source file for ./${path}.`)
}

// The module of each value export of `@rootnative/web`, read from its source. A file of a name
// imports its own module and never the root entry: Metro has no tree shaking, so the root entry
// loads every component into the app. A namespace export, `export * as Animated from`, is the
// whole module.
export const runtimeModules = () => {
  const index = readFileSync(join(runtimeSource, 'index.ts'), 'utf8')
  const modules = new Map()
  for (const [, list, from] of index.matchAll(/^export \{([^}]*)\} from '\.\/([^']+)'/gm)) {
    const specifier = `@rootnative/web/internal/${moduleFile(from)}.js`
    for (const entry of list.split(',')) {
      const name = entry.trim()
      if (name === '' || name.startsWith('type ')) continue
      modules.set(name.split(' as ').pop().trim(), { specifier, namespace: false })
    }
  }
  for (const [, name, from] of index.matchAll(/^export \* as (\w+) from '\.\/([^']+)'/gm)) {
    const specifier = `@rootnative/web/internal/${moduleFile(from)}.js`
    modules.set(name, { specifier, namespace: true })
  }
  return modules
}

// react-native-web has `createElement`. React Native and `@rootnative/web` have the same
// function as `unstable_createElement`.
const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

// The names that this package gives itself, and their files in `src/`. `@rootnative/web` doesn't
// have them: Expo's own launch code calls `AppRegistry`, and the others are native APIs that
// Expo's libraries import on the web too.
export const SUPPLIED = {
  AppRegistry: 'AppRegistry.js',
  AssetRegistry: 'AssetRegistry.js',
  DeviceEventEmitter: 'DeviceEventEmitter.js',
  LogBox: 'LogBox.js',
  NativeEventEmitter: 'NativeEventEmitter.js',
  NativeModules: 'NativeModules.js',
  UIManager: 'UIManager.js',
}

const exportFile = (name, missing, modules) => {
  if (Object.hasOwn(SUPPLIED, name)) {
    return `export { ${name} as default } from '../../${SUPPLIED[name]}'\n`
  }
  if (missing.has(name)) {
    return `import { missing } from '../../missing.js'\n\nexport default missing('${name}')\n`
  }
  const runtime = runtimeName(name)
  const module = modules.get(runtime)
  if (module === undefined) {
    throw new Error(`${name} isn't an export of @rootnative/web. Add it to the missing list.`)
  }
  return module.namespace
    ? `export * as default from '${module.specifier}'\n`
    : `export { ${runtime} as default } from '${module.specifier}'\n`
}

// Reanimated 4 reads its web style helpers from these two internal files of react-native-web.
// The first has the function as its default export, and the second has named exports. The style
// entry of the runtime has both shapes.
const STYLE_FILES = [
  'cjs/exports/StyleSheet/compiler/createReactDOMStyle.js',
  'cjs/exports/StyleSheet/preprocess.js',
]
const styleFile = `export * from '@rootnative/web/style'\nexport { default } from '@rootnative/web/style'\n`

// Expo's `AppRegistry` for the web reads `createSheet` from this file of react-native-web.
const SHEET_FILE = 'exports/StyleSheet/dom/index.js'

// `expo-system-ui` calls the result of `require()` of this file as a function, so the file must
// set `module.exports`, as the CommonJS build of react-native-web does. An ES default export
// gives `require()` an object.
export const NORMALIZE_COLOR_FILE = 'cjs/modules/normalizeColor/index.js'

// The files of `src/` that go into `dist/` as they are.
export const SOURCE_FILES = [
  ...Object.values(SUPPLIED),
  'createSheet.js',
  'missing.js',
  'normalizeColor.js',
]

// The path of each generated file, from `dist/`, and its text.
export const facadeFiles = ({ names, missing } = readExports(), modules = runtimeModules()) => {
  const gaps = new Set(missing)
  const files = new Map()
  for (const name of names) files.set(`exports/${name}/index.js`, exportFile(name, gaps, modules))
  for (const path of STYLE_FILES) files.set(path, styleFile)
  files.set(SHEET_FILE, `export { createSheet } from '../../../createSheet.js'\n`)
  files.set(
    NORMALIZE_COLOR_FILE,
    `module.exports = require('../../../normalizeColor.js').normalizeColor\n`,
  )
  const index = [
    `export * from '@rootnative/web'`,
    `export { unstable_createElement as createElement } from '@rootnative/web'`,
    ...Object.entries(SUPPLIED).map(([name, file]) => `export { ${name} } from './${file}'`),
    ...missing.map((name) => `export { default as ${name} } from './exports/${name}/index.js'`),
  ]
  files.set('index.js', `${index.join('\n')}\n`)
  return files
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const distDir = join(packageDir, 'dist')
  rmSync(distDir, { recursive: true, force: true })
  for (const [path, text] of facadeFiles()) {
    mkdirSync(dirname(join(distDir, path)), { recursive: true })
    writeFileSync(join(distDir, path), text)
  }
  for (const file of SOURCE_FILES) cpSync(join(packageDir, 'src', file), join(distDir, file))
  console.log(`Wrote ${facadeFiles().size + SOURCE_FILES.length} files to dist/.`)
}
