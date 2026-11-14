// Writes `dist/`, with the file layout of react-native-web. Expo's Metro transform rewrites
// `import { View } from 'react-native'` to `react-native-web/dist/exports/View` on the web, and
// each other import to `react-native-web/dist/index`. An app installs this package under the
// name `react-native-web`, so those paths load `@rootnative/web`.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

export const readExports = () =>
  JSON.parse(readFileSync(join(packageDir, 'expo-exports.json'), 'utf8'))

// react-native-web has `createElement`. React Native and `@rootnative/web` have the same
// function as `unstable_createElement`.
const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

const exportFile = (name, missing) => {
  if (name === 'AppRegistry')
    return `export { AppRegistry as default } from '../../AppRegistry.js'\n`
  if (missing.has(name)) {
    return `import { missing } from '../../missing.js'\n\nexport default missing('${name}')\n`
  }
  return `export { ${runtimeName(name)} as default } from '@rootnative/web'\n`
}

// Reanimated 4 reads its web style helpers from these two internal files of react-native-web.
// The first has the function as its default export, and the second has named exports. The style
// entry of the runtime has both shapes.
const STYLE_FILES = [
  'cjs/exports/StyleSheet/compiler/createReactDOMStyle.js',
  'cjs/exports/StyleSheet/preprocess.js',
]
const styleFile = `export * from '@rootnative/web/style'\nexport { default } from '@rootnative/web/style'\n`

// The path of each generated file, from `dist/`, and its text.
export const facadeFiles = ({ names, missing } = readExports()) => {
  const gaps = new Set(missing)
  const files = new Map()
  for (const name of names) files.set(`exports/${name}/index.js`, exportFile(name, gaps))
  for (const path of STYLE_FILES) files.set(path, styleFile)
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
  for (const file of ['AppRegistry.js', 'missing.js']) {
    cpSync(join(packageDir, 'src', file), join(distDir, file))
  }
  console.log(`Wrote ${facadeFiles().size + 2} files to dist/.`)
}
