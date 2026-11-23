import { posix } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, test } from 'vitest'

import {
  facadeFiles,
  NORMALIZE_COLOR_FILE,
  readExports,
  runtimeModules,
  SOURCE_FILES,
  SUPPLIED,
} from '../scripts/build.mjs'
import { missing as missingExport } from '../src/missing.js'
import { normalizeColor } from '../src/normalizeColor.js'

const { names, missing } = readExports()

const runtimeName = (name) => (name === 'createElement' ? 'unstable_createElement' : name)

describe('the list of names', () => {
  const runtime = new Set(runtimeModules().keys())
  const supplied = new Set(Object.keys(SUPPLIED))

  test('each name comes from the runtime, from this package, or is in the missing list', () => {
    const lost = names.filter(
      (name) => !missing.includes(name) && !supplied.has(name) && !runtime.has(runtimeName(name)),
    )
    expect(lost).toEqual([])
  })

  test('the missing list has no name that the runtime exports or this package supplies', () => {
    expect(missing.filter((name) => runtime.has(name) || supplied.has(name))).toEqual([])
    expect(missing.filter((name) => !names.includes(name))).toEqual([])
  })
})

describe('the generated files', () => {
  const files = facadeFiles()

  test('has one file for each name, the index, the two style files of Reanimated, the sheet file, and normalizeColor', () => {
    expect(files.size).toBe(names.length + 5)
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
    expect(files.get('exports/Animated/index.js')).toBe(
      `export * as default from '@rootnative/web/internal/apis/Animated/AnimatedExports.js'\n`,
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

  test('gives expo-system-ui normalizeColor as the CommonJS export, where react-native-web has it', () => {
    const text = files.get(NORMALIZE_COLOR_FILE)
    const module = { exports: {} }
    const required = []
    const require = (path) => {
      required.push(path)
      return { normalizeColor }
    }
    runInNewContext(text, { module, exports: module.exports, require })

    expect(module.exports).toBe(normalizeColor)
    expect(required).toHaveLength(1)
    const target = posix.join('dist', posix.dirname(NORMALIZE_COLOR_FILE), required[0])
    expect(target).toBe('dist/normalizeColor.js')
    expect(SOURCE_FILES).toContain('normalizeColor.js')
  })

  test('gives a name that this package supplies its own file', () => {
    for (const [name, file] of Object.entries(SUPPLIED)) {
      expect(files.get(`exports/${name}/index.js`)).toBe(
        `export { ${name} as default } from '../../${file}'\n`,
      )
      expect(files.get('index.js')).toContain(`export { ${name} } from './${file}'`)
    }
  })

  test('gives a missing name a stub, and the index exports it by name', () => {
    expect(files.get('exports/CheckBox/index.js')).toContain(`missing('CheckBox')`)
    expect(files.get('index.js')).toContain(
      `export { default as CheckBox } from './exports/CheckBox/index.js'`,
    )
  })
})

describe('a missing export', () => {
  test('throws an error with its name on a use, not on the import', () => {
    const CheckBox = missingExport('CheckBox')
    expect(() => CheckBox.propTypes).toThrow('CheckBox is not in @rootnative/web yet')
    expect(() => CheckBox()).toThrow('CheckBox is not in @rootnative/web yet')
  })
})
