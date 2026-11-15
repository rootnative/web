import { describe, expect, test } from 'vitest'

import { facadeFiles, readExports, runtimeModules } from '../scripts/build.mjs'
import { missing as missingExport } from '../src/missing.js'

const { names, missing } = readExports()

const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

describe('the list of names', () => {
  const runtime = new Set(runtimeModules().keys())
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

  test('has one file for each name, the index, the two style files of Reanimated, and the sheet file', () => {
    expect(files.size).toBe(names.length + 4)
    for (const path of [
      'cjs/exports/StyleSheet/compiler/createReactDOMStyle.js',
      'cjs/exports/StyleSheet/preprocess.js',
    ]) {
      expect(files.get(path)).toContain(`export { default } from '@rootnative/web/style'`)
    }
    for (const name of names) expect(files.has(`exports/${name}/index.js`)).toBe(true)
  })

  test('re-exports a name of the runtime as the default export, from its own module', () => {
    expect(files.get('exports/View/index.js')).toBe(
      `export { View as default } from '@rootnative/web/internal/components/View/index.js'\n`,
    )
    expect(files.get('exports/createElement/index.js')).toBe(
      `export { unstable_createElement as default } from '@rootnative/web/internal/compat/createElement/index.js'\n`,
    )
  })

  // Metro has no tree shaking. One import of the root entry loads every component into the app.
  test('no file of a name imports the root entry of the runtime', () => {
    const rootImports = names.filter((name) =>
      files.get(`exports/${name}/index.js`).includes(`from '@rootnative/web'`),
    )
    expect(rootImports).toEqual([])
  })

  test('gives Expo the createSheet function where react-native-web has it', () => {
    expect(files.get('exports/StyleSheet/dom/index.js')).toBe(
      `export { createSheet } from '../../../createSheet.js'\n`,
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
