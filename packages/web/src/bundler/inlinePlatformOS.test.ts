import { parseAst } from 'vite'
import { describe, expect, test } from 'vitest'

import { inlinePlatformOS } from './inlinePlatformOS'

const inline = (code: string): string | null => inlinePlatformOS(code, parseAst(code))

describe('inlinePlatformOS', () => {
  test('replaces Platform.OS with "web" at the same length', () => {
    const code =
      "import { Platform } from 'react-native'\nexport const os = Platform.OS === 'ios'\n"
    const output = inline(code)
    expect(output).toBe(code.replace('Platform.OS', '"web"      '))
    expect(output).toHaveLength(code.length)
  })

  test('accepts Platform from @rootnative/web', () => {
    const code = "import { Platform } from '@rootnative/web'\nexport const os = Platform.OS\n"
    expect(inline(code)).toContain('export const os = "web"')
  })

  test('follows a renamed import', () => {
    const code =
      "import { Platform as RNPlatform } from 'react-native'\nexport const os = RNPlatform.OS\n"
    expect(inline(code)).toContain('export const os = "web"')
  })

  test('follows a namespace import', () => {
    const code =
      "import * as ReactNative from 'react-native'\nexport const os = ReactNative.Platform.OS\n"
    expect(inline(code)).toContain('export const os = "web"')
  })

  test('replaces an optional read', () => {
    const code = "import { Platform } from 'react-native'\nexport const os = Platform?.OS\n"
    expect(inline(code)).toContain('export const os = "web"')
  })

  test('replaces every read in the module', () => {
    const code =
      "import { Platform } from 'react-native'\nexport const a = Platform.OS\nexport const b = `${Platform.OS}!`\n"
    expect(inline(code)).not.toContain('Platform.OS')
  })

  test('keeps a Platform from another module', () => {
    const code = "import { Platform } from './platform'\nexport const os = Platform.OS\n"
    expect(inline(code)).toBeNull()
  })

  test('keeps a global Platform', () => {
    expect(inline('export const os = Platform.OS\n')).toBeNull()
  })

  test('keeps a name that a local binding shadows', () => {
    const code =
      "import { Platform } from 'react-native'\nexport const a = Platform.OS\nexport const read = (Platform) => Platform.OS\n"
    expect(inline(code)).toBeNull()
  })

  test('keeps a write to Platform.OS', () => {
    const code =
      "import { Platform } from 'react-native'\nPlatform.OS = 'ios'\nexport const os = Platform.OS\n"
    const output = inline(code)
    expect(output).toContain("Platform.OS = 'ios'")
    expect(output).toContain('export const os = "web"')
  })

  test('keeps a read shorter than the replacement', () => {
    const code = "import { Platform as P } from 'react-native'\nexport const os = P.OS\n"
    expect(inline(code)).toBeNull()
  })

  test('keeps a read that spans lines', () => {
    const code = "import { Platform } from 'react-native'\nexport const os = Platform\n  .OS\n"
    expect(inline(code)).toBeNull()
  })

  test('keeps strings and comments', () => {
    const code =
      "import { Platform } from 'react-native'\n// Platform.OS\nexport const label = 'Platform.OS'\n"
    expect(inline(code)).toBeNull()
  })

  test('keeps other members of Platform', () => {
    const code =
      "import { Platform } from 'react-native'\nexport const version = Platform.Version\nexport const os = Platform['OS']\n"
    expect(inline(code)).toBeNull()
  })

  test('counts offsets in UTF-16 code units', () => {
    const code =
      "import { Platform } from 'react-native'\nconst s = '😀é'; export const os = Platform.OS\n"
    expect(inline(code)).toBe(code.replace('Platform.OS', '"web"      '))
  })
})
