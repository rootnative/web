// Writes `dist/`: the facade of `@rootnative/web-expo`, with the file layout of react-native-web,
// from the same generator. On the web, `withRootNative` sends `react-native` and each path of
// react-native-web to these files, and the Babel transformer rewrites a named import of
// `react-native` to one of them.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { facadeFiles, SOURCE_FILES } from '../../web-expo/scripts/build.mjs'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const expoSource = join(packageDir, '..', 'web-expo', 'src')

export const writeFacade = (distDir) => {
  rmSync(distDir, { recursive: true, force: true })
  const files = facadeFiles()
  for (const [path, text] of files) {
    mkdirSync(dirname(join(distDir, path)), { recursive: true })
    writeFileSync(join(distDir, path), text)
  }
  for (const file of SOURCE_FILES) cpSync(join(expoSource, file), join(distDir, file))
  return files.size + SOURCE_FILES.length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Wrote ${writeFacade(join(packageDir, 'dist'))} files to dist/.`)
}
