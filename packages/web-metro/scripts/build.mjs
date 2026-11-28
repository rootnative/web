// Writes `dist/`: the facade, plus the dev client in `AppRegistry.js`. On the web,
// `withRootNative` sends `react-native` and each path of react-native-web to these files, and the
// Babel transformer rewrites a named import of `react-native` to one of them.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { writeFacade } from './facade.mjs'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// Each web app loads `AppRegistry`, so its file brings the dev client into the graph of Metro.
// In production, `__DEV__` is false, and Metro drops the require before it collects the imports.
// Only this package has it: Expo has a dev client of its own.
export const DEV_CLIENT_REQUIRE = `// Fast Refresh and the updates of the dev server, in development only.
if (__DEV__) require('../dev-client.js')

`

export const writeDist = (distDir) => {
  const count = writeFacade(distDir)
  const appRegistry = join(distDir, 'AppRegistry.js')
  writeFileSync(appRegistry, DEV_CLIENT_REQUIRE + readFileSync(appRegistry, 'utf8'))
  return count
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Wrote ${writeDist(join(packageDir, 'dist'))} files to dist/.`)
}
