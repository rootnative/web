import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'vitest'

import { EXPORTS_FILE, facadeFiles, SOURCE_FILES } from '../../web-metro/scripts/facade.mjs'
import { EXPORTS_COPY, writeDist } from '../scripts/build.mjs'

test("the build writes web-metro's facade, with no dev client, and the list of names", () => {
  const target = mkdtempSync(join(tmpdir(), 'web-expo-'))
  const files = facadeFiles()
  expect(writeDist(target)).toBe(files.size + SOURCE_FILES.length)
  for (const [path, text] of files) {
    expect(readFileSync(join(target, 'dist', path), 'utf8')).toBe(text)
  }
  for (const file of SOURCE_FILES) expect(existsSync(join(target, 'dist', file))).toBe(true)
  expect(readFileSync(join(target, 'dist', 'AppRegistry.js'), 'utf8')).not.toContain('dev-client')
  expect(readFileSync(join(target, EXPORTS_COPY), 'utf8')).toBe(readFileSync(EXPORTS_FILE, 'utf8'))
})
