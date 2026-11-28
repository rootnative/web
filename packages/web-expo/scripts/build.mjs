// Writes `dist/` and `expo-exports.json` from the facade of `@rootnative/web-metro`, at build time.
// The package has no dependency on web-metro: an Expo app needs only these files, and Expo has a
// dev client of its own.

import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EXPORTS_FILE, writeFacade } from '../../web-metro/scripts/facade.mjs'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// The list of names ships as `expo-exports.json`. Its "missing" names load as stubs.
export const EXPORTS_COPY = 'expo-exports.json'

export const writeDist = (targetDir = packageDir) => {
  const count = writeFacade(join(targetDir, 'dist'))
  copyFileSync(EXPORTS_FILE, join(targetDir, EXPORTS_COPY))
  return count
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Wrote ${writeDist()} files to dist/, and ${EXPORTS_COPY}.`)
}
