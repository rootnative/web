import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, test, vi } from 'vitest'

import { ICON_SET_FILE, patchIconSet } from './iconFonts'

// The version that the playground installs. When a new version changes the code, this test fails
// on CI, before an app gets the warning.
const installedFile = (): string => {
  const fromPlayground = createRequire(
    decodeURIComponent(new URL('../../../playground/package.json', import.meta.url).pathname),
  )
  const packageFile = fromPlayground.resolve('@react-native-vector-icons/common/package.json')
  return join(dirname(packageFile), 'lib', 'module', 'create-icon-set.js')
}

// Runs the code around the patch with a fake document, and gives back what it did.
const run = (
  code: string,
  { fontSource, existing = [] }: { fontSource: unknown; existing?: string[] },
) => {
  const added: { family: string; source: string }[] = []
  const loads = vi.fn(() => Promise.resolve())
  class FakeFontFace {
    family: string
    source: string
    constructor(family: string, source: string) {
      this.family = family
      this.source = source
    }
    load = loads
  }
  const fonts = Object.assign(
    existing.map((family) => ({ family })),
    { add: (face: FakeFontFace) => added.push({ family: face.family, source: face.source }) },
  )
  runInNewContext(code, {
    fontReference: 'MaterialDesignIcons',
    fontSource,
    document: { fonts },
    FontFace: FakeFontFace,
    console,
  })
  return { added, loads }
}

// The step that the patch adds: from its `if` to the brace that closes it.
const snippet = (code: string): string => {
  const match = /const fontUrl = [\s\S]*?\n\s*\}\n/.exec(code)
  if (match === null) throw new Error('The patch is not in the code.')
  return match[0]
}

describe('patchIconSet', () => {
  test('matches the file of createIconSet only', () => {
    expect(ICON_SET_FILE.test(installedFile())).toBe(true)
    expect(
      ICON_SET_FILE.test('/node_modules/@react-native-vector-icons/common/lib/module/index.js'),
    ).toBe(false)
  })

  test('patches the installed version, after the line that reads fontSource', () => {
    const code = readFileSync(installedFile(), 'utf8')
    const patched = patchIconSet(code)
    expect(patched).not.toBeNull()
    const lines = (patched as string).split('\n')
    const fontSourceLine = lines.findIndex((line) => line.includes('const fontSource ='))
    expect(lines[fontSourceLine + 1]).toContain('const fontUrl = ')
    expect(lines.findIndex((line) => line.includes('const fontReference ='))).toBeLessThan(
      fontSourceLine,
    )
  })

  // A string from a build, a module object from Vite's dependency optimizer, and a `{ uri }`.
  test.each([
    ['a URL', '/assets/MaterialDesignIcons-x1.ttf'],
    ['a module object', { default: '/assets/MaterialDesignIcons-x1.ttf' }],
    ['a uri object', { uri: '/assets/MaterialDesignIcons-x1.ttf' }],
  ])('adds a FontFace of %s, with the family of the icons, and loads it', (_, fontSource) => {
    const code = snippet(patchIconSet(readFileSync(installedFile(), 'utf8')) as string)
    const { added, loads } = run(code, { fontSource })
    expect(added).toEqual([
      { family: 'MaterialDesignIcons', source: 'url("/assets/MaterialDesignIcons-x1.ttf")' },
    ])
    expect(loads).toHaveBeenCalledOnce()
  })

  test('adds nothing for a family that the page has, or for a source that is not a URL', () => {
    const code = snippet(patchIconSet(readFileSync(installedFile(), 'utf8')) as string)
    expect(run(code, { fontSource: '/x.ttf', existing: ['"MaterialDesignIcons"'] }).added).toEqual(
      [],
    )
    expect(run(code, { fontSource: 12 }).added).toEqual([])
    expect(run(code, { fontSource: false }).added).toEqual([])
    expect(run(code, { fontSource: { default: 12 } }).added).toEqual([])
  })

  test('gives null for a file without the line', () => {
    expect(patchIconSet('export const createIconSet = () => null')).toBeNull()
  })
})
