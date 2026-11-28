import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'vitest'

import { facadeFiles, SOURCE_FILES } from '../../web-expo/scripts/build.mjs'
import { DEV_CLIENT_REQUIRE, writeFacade } from '../scripts/build.mjs'

test('dist has the facade of web-expo: the generated files and the files it supplies', () => {
  const dist = join(mkdtempSync(join(tmpdir(), 'web-metro-dist-')), 'dist')
  const files = facadeFiles()
  expect(writeFacade(dist)).toBe(files.size + SOURCE_FILES.length)
  for (const [path, text] of files) expect(readFileSync(join(dist, path), 'utf8')).toBe(text)
  for (const file of SOURCE_FILES) expect(existsSync(join(dist, file))).toBe(true)
  expect(existsSync(join(dist, 'exports', 'View', 'index.js'))).toBe(true)
  expect(existsSync(join(dist, 'AppRegistry.js'))).toBe(true)
})

test('AppRegistry.js requires the dev client in development only', () => {
  const dist = join(mkdtempSync(join(tmpdir(), 'web-metro-dist-')), 'dist')
  writeFacade(dist)
  const appRegistry = readFileSync(join(dist, 'AppRegistry.js'), 'utf8')
  expect(appRegistry.startsWith(DEV_CLIENT_REQUIRE)).toBe(true)
  expect(appRegistry).toContain("if (__DEV__) require('../dev-client.js')")
})
