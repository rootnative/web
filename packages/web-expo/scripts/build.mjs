// Writes `dist/`, with the file layout of react-native-web. Expo's Metro transform rewrites
// `import { View } from 'react-native'` to `react-native-web/dist/exports/View` on the web, and
// each other import to `react-native-web/dist/index`. An app installs this package under the
// name `react-native-web`, so those paths load `@rootnative/web`.

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
// loads every component into the app.
export const runtimeModules = () => {
  const index = readFileSync(join(runtimeSource, 'index.ts'), 'utf8')
  const modules = new Map()
  for (const [, list, from] of index.matchAll(/^export \{([^}]*)\} from '\.\/([^']+)'/gm)) {
    const specifier = `@rootnative/web/internal/${moduleFile(from)}.js`
    for (const entry of list.split(',')) {
      const name = entry.trim()
      if (name === '' || name.startsWith('type ')) continue
      modules.set(name.split(' as ').pop().trim(), specifier)
    }
  }
  return modules
}

// react-native-web has `createElement`. React Native and `@rootnative/web` have the same
// function as `unstable_createElement`.
const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

const exportFile = (name, missing, modules) => {
  if (name === 'AppRegistry')
    return `export { AppRegistry as default } from '../../AppRegistry.js'\n`
  if (missing.has(name)) {
    return `import { missing } from '../../missing.js'\n\nexport default missing('${name}')\n`
  }
  const runtime = runtimeName(name)
  const specifier = modules.get(runtime)
  if (specifier === undefined) {
    throw new Error(`${name} isn't an export of @rootnative/web. Add it to the missing list.`)
  }
  return `export { ${runtime} as default } from '${specifier}'\n`
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

// The files of `src/` that go into `dist/` as they are.
const SOURCE_FILES = ['AppRegistry.js', 'createSheet.js', 'missing.js']

// The path of each generated file, from `dist/`, and its text.
export const facadeFiles = ({ names, missing } = readExports(), modules = runtimeModules()) => {
  const gaps = new Set(missing)
  const files = new Map()
  for (const name of names) files.set(`exports/${name}/index.js`, exportFile(name, gaps, modules))
  for (const path of STYLE_FILES) files.set(path, styleFile)
  files.set(SHEET_FILE, `export { createSheet } from '../../../createSheet.js'\n`)
  const index = [
    `export * from '@rootnative/web'`,
    `export { unstable_createElement as createElement } from '@rootnative/web'`,
    `export { AppRegistry } from './AppRegistry.js'`,
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
