// Writes `dist/`: the facade of `@rootnative/web-expo`, with the file layout of react-native-web,
// from the same generator. On the web, `withRootNative` sends `react-native` and each path of
// react-native-web to these files, and the Babel transformer rewrites a named import of
// `react-native` to one of them.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { facadeFiles, SOURCE_FILES } from '../../web-expo/scripts/build.mjs'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const expoSource = join(packageDir, '..', 'web-expo', 'src')

// Each web app loads `AppRegistry`, so its file brings the dev client into the graph of Metro.
// In production, `__DEV__` is false, and Metro drops the require before it collects the imports.
export const DEV_CLIENT_REQUIRE = `// Fast Refresh and the updates of the dev server, in development only.
if (__DEV__) require('../dev-client.js')

`

export const writeFacade = (distDir) => {
  rmSync(distDir, { recursive: true, force: true })
  const files = facadeFiles()
  for (const [path, text] of files) {
    mkdirSync(dirname(join(distDir, path)), { recursive: true })
    writeFileSync(join(distDir, path), text)
  }
  for (const file of SOURCE_FILES) cpSync(join(expoSource, file), join(distDir, file))
  const appRegistry = join(distDir, 'AppRegistry.js')
  writeFileSync(appRegistry, DEV_CLIENT_REQUIRE + readFileSync(appRegistry, 'utf8'))
  return files.size + SOURCE_FILES.length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Wrote ${writeFacade(join(packageDir, 'dist'))} files to dist/.`)
}
