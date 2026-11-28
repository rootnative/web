import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from 'vitest'

import { DEV_CLIENT_REQUIRE, writeDist } from '../scripts/build.mjs'
import { facadeFiles, SOURCE_FILES } from '../scripts/facade.mjs'

const build = () => {
  const dist = join(mkdtempSync(join(tmpdir(), 'web-metro-dist-')), 'dist')
  return { dist, count: writeDist(dist) }
}

test('dist has the facade: the generated files and the files it supplies', () => {
  const { dist, count } = build()
  const files = facadeFiles()
  expect(count).toBe(files.size + SOURCE_FILES.length)
  for (const [path, text] of files) expect(readFileSync(join(dist, path), 'utf8')).toBe(text)
  for (const file of SOURCE_FILES) expect(existsSync(join(dist, file))).toBe(true)
  expect(existsSync(join(dist, 'exports', 'View', 'index.js'))).toBe(true)
})

test('AppRegistry.js requires the dev client in development only', () => {
  const appRegistry = readFileSync(join(build().dist, 'AppRegistry.js'), 'utf8')
  expect(appRegistry.startsWith(DEV_CLIENT_REQUIRE)).toBe(true)
  expect(appRegistry).toContain("if (__DEV__) require('../dev-client.js')")
})
