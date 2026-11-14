import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { facadeFiles, readExports } from '../scripts/build.mjs'
import { missing as missingExport } from '../src/missing.js'

const { names, missing } = readExports()

// The value exports of `@rootnative/web`, from its source. The package has no build here.
const runtimeExports = () => {
  const index = readFileSync(
    fileURLToPath(new URL('../../web/src/index.ts', import.meta.url)),
    'utf8',
  )
  const found = new Set()
  for (const [, list] of index.matchAll(/^export \{([^}]*)\} from/gm)) {
    for (const entry of list.split(',')) {
      const name = entry.trim()
      if (name === '' || name.startsWith('type ')) continue
      found.add(name.split(' as ').pop().trim())
    }
  }
  return found
}

const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

describe('the list of names', () => {
  const runtime = runtimeExports()
  const supplied = new Set(['AppRegistry'])

  test('each name comes from the runtime, from this package, or is in the missing list', () => {
    const lost = names.filter(
      (name) => !missing.includes(name) && !supplied.has(name) && !runtime.has(runtimeName(name)),
    )
    expect(lost).toEqual([])
  })

  test('the missing list has no name that the runtime exports now', () => {
    expect(missing.filter((name) => runtime.has(name))).toEqual([])
    expect(missing.filter((name) => !names.includes(name))).toEqual([])
  })
})

describe('the generated files', () => {
  const files = facadeFiles()

  test('has one file for each name, the index, and the two style files of Reanimated', () => {
    expect(files.size).toBe(names.length + 3)
    for (const path of [
      'cjs/exports/StyleSheet/compiler/createReactDOMStyle.js',
      'cjs/exports/StyleSheet/preprocess.js',
    ]) {
      expect(files.get(path)).toContain(`export { default } from '@rootnative/web/style'`)
    }
    for (const name of names) expect(files.has(`exports/${name}/index.js`)).toBe(true)
  })

  test('re-exports a name of the runtime as the default export', () => {
    expect(files.get('exports/View/index.js')).toBe(
      `export { View as default } from '@rootnative/web'\n`,
    )
    expect(files.get('exports/createElement/index.js')).toBe(
      `export { unstable_createElement as default } from '@rootnative/web'\n`,
    )
  })

  test('gives a missing name a stub, and the index exports it by name', () => {
    expect(files.get('exports/Animated/index.js')).toContain(`missing('Animated')`)
    expect(files.get('index.js')).toContain(
      `export { default as Animated } from './exports/Animated/index.js'`,
    )
  })
})

describe('a missing export', () => {
  test('throws an error with its name on a use, not on the import', () => {
    const Animated = missingExport('Animated')
    expect(() => Animated.View).toThrow('Animated is not in @rootnative/web yet')
    expect(() => Animated()).toThrow('Animated is not in @rootnative/web yet')
  })
})
