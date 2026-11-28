import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { isProductionEnv, isTestEnv } from './env'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('the mode', () => {
  test('comes from process.env.NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isProductionEnv()).toBe(true)
    expect(isTestEnv()).toBe(false)
    vi.stubEnv('NODE_ENV', 'test')
    expect(isProductionEnv()).toBe(false)
    expect(isTestEnv()).toBe(true)
  })

  test('is unknown, with no error, when there is no process', () => {
    vi.stubGlobal('process', undefined)
    let modes: boolean[]
    try {
      modes = [isProductionEnv(), isTestEnv()]
    } finally {
      vi.unstubAllGlobals()
    }
    expect(modes).toEqual([false, false])
  })
})

const src = fileURLToPath(new URL('..', import.meta.url))

// The code of the bundler plugins runs in Node, and the tests run on Vite.
const runtimeFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return ['bundler', 'test', 'vite'].includes(entry.name) && dir === src
        ? []
        : runtimeFiles(path)
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

// The source with no comments, because a comment can name `import.meta`.
const codeOf = (file: string): string =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

test('the runtime has no import.meta, so a Metro bundle, a classic script, can load it', () => {
  const files = runtimeFiles(src)
  expect(files.length).toBeGreaterThan(100)
  const withImportMeta = files
    .filter((file) => codeOf(file).includes('import.meta'))
    .map((file) => relative(src, file))
  expect(withImportMeta).toEqual([])
})
