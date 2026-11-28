import { afterEach, describe, expect, test, vi } from 'vitest'

import { registerAsset } from '../../assets-registry'
import { resetWarnings } from '../../utils/warn'
import { assetURL, resolveAssetSource, resolveSource } from './source'

afterEach(() => {
  resetWarnings()
  vi.restoreAllMocks()
})

// An id that no test registers.
const UNREGISTERED = 9999

// A Metro asset, as `require('./images/logo.png')` registers it.
const plainLogo = {
  httpServerLocation: '/assets/images',
  name: 'logo',
  type: 'png',
  scales: [1, 2],
  width: 48,
  height: 24,
}
const logo = { ...plainLogo, hash: 'abc' }

describe('resolveSource', () => {
  test('a uri source', () => {
    const out = resolveSource(
      { uri: '/a.png', width: 10, height: 20 },
      undefined,
      undefined,
      undefined,
    )
    expect(out.src).toBe('/a.png')
    expect(out.srcSet).toBeUndefined()
    expect(out.width).toBe(10)
    expect(out.height).toBe(20)
    expect(out.request).toBeUndefined()
  })

  test('a string source is a URL', () => {
    expect(resolveSource('/a.png', undefined, undefined, undefined).src).toBe('/a.png')
  })

  test('a numeric source that the registry lacks warns once and loads nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveSource(UNREGISTERED, undefined, undefined, undefined).src).toBeUndefined()
    resolveSource(UNREGISTERED + 1, undefined, undefined, undefined)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('a Metro asset id is a srcset with x descriptors, and has the size of the asset', () => {
    const out = resolveSource(registerAsset(logo), undefined, undefined, 300)
    expect(out.src).toBe('/assets/images/logo.png?platform=web&hash=abc')
    expect(out.srcSet).toBe(
      '/assets/images/logo.png?platform=web&hash=abc 1x, /assets/images/logo@2x.png?platform=web&hash=abc 2x',
    )
    expect(out.sizes).toBeUndefined()
    expect([out.width, out.height]).toEqual([48, 24])
  })

  test('a Metro asset id with one scale is a src only', () => {
    const out = resolveSource(registerAsset({ ...logo, scales: [3] }), undefined, undefined, 300)
    expect(out.src).toBe('/assets/images/logo@3x.png?platform=web&hash=abc')
    expect(out.srcSet).toBeUndefined()
  })

  test('headers make a request', () => {
    const out = resolveSource(
      { uri: '/a.png', headers: { Authorization: 'Bearer x' } },
      undefined,
      undefined,
      undefined,
    )
    expect(out.request).toEqual({
      method: 'GET',
      headers: { Authorization: 'Bearer x' },
      body: undefined,
    })
  })

  test('src and srcSet win over source', () => {
    const out = resolveSource({ uri: '/a.png' }, '/b.png', '/b.png 1x, /b@2x.png 2x', undefined)
    expect(out.src).toBe('/b.png')
    expect(out.srcSet).toBe('/b.png 1x, /b@2x.png 2x')
  })

  test('srcSet alone takes its first candidate as src', () => {
    const out = resolveSource(undefined, undefined, '/s.png 400w, /l.png 800w', undefined)
    expect(out.src).toBe('/s.png')
    expect(out.sizes).toBe('100vw')
  })

  test('scaled sources become x descriptors with the 1x as src', () => {
    const out = resolveSource(
      [
        { uri: '/a@2x.png', scale: 2 },
        { uri: '/a.png', scale: 1 },
      ],
      undefined,
      undefined,
      undefined,
    )
    expect(out.src).toBe('/a.png')
    expect(out.srcSet).toBe('/a@2x.png 2x, /a.png 1x')
    expect(out.sizes).toBeUndefined()
  })

  test('sized sources become w descriptors with sizes from the layout width', () => {
    const sources = [
      { uri: '/s.png', width: 400 },
      { uri: '/l.png', width: 800 },
    ]
    expect(resolveSource(sources, undefined, undefined, 300).sizes).toBe('300px')
    const out = resolveSource(sources, undefined, undefined, undefined)
    expect(out.srcSet).toBe('/s.png 400w, /l.png 800w')
    expect(out.sizes).toBe('100vw')
    expect(out.src).toBe('/s.png')
  })

  test('a mixed list takes its first entry', () => {
    const out = resolveSource(
      [{ uri: '/a.png', scale: 1 }, { uri: '/b.png' }],
      undefined,
      undefined,
      undefined,
    )
    expect(out.src).toBe('/a.png')
    expect(out.srcSet).toBeUndefined()
  })

  test('entries without a uri are dropped', () => {
    expect(resolveSource([{}, { uri: '' }], undefined, undefined, undefined).src).toBeUndefined()
    expect(resolveSource({}, undefined, undefined, undefined).src).toBeUndefined()
  })
})

describe('resolveAssetSource', () => {
  test('returns the uri with its size and scale', () => {
    expect(resolveAssetSource({ uri: '/a.png', width: 1, height: 2 })).toEqual({
      uri: '/a.png',
      width: 1,
      height: 2,
      scale: 1,
    })
    expect(resolveAssetSource({ uri: '/a.png', scale: 3 })?.scale).toBe(3)
  })

  test('takes the first of a list, a string, and null for the rest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveAssetSource([{ uri: '/a.png' }, { uri: '/b.png' }])?.uri).toBe('/a.png')
    expect(resolveAssetSource('/a.png')).toEqual({ uri: '/a.png', scale: 1 })
    expect(resolveAssetSource(UNREGISTERED)).toBeNull()
    expect(resolveAssetSource(undefined)).toBeNull()
    expect(resolveAssetSource({})).toBeNull()
  })
})

describe('a Metro asset id', () => {
  test('resolveAssetSource picks the first scale at or above the screen', () => {
    // The test browser has a pixel ratio of 1.
    expect(resolveAssetSource(registerAsset({ ...logo, scales: [2, 3] }))).toEqual({
      uri: '/assets/images/logo@2x.png?platform=web&hash=abc',
      width: 48,
      height: 24,
      scale: 2,
    })
  })

  test('on the dev server, the URL asks for the web file of the image', () => {
    expect(assetURL(logo, 1, false)).toBe('/assets/images/logo.png?platform=web&hash=abc')
    expect(assetURL(plainLogo, 2, false)).toBe('/assets/images/logo@2x.png?platform=web')
  })

  test('on the dev server, a location outside the project goes in the query', () => {
    const shared = { ...logo, httpServerLocation: '/assets/../shared/images' }
    expect(assetURL(shared, 2, false)).toBe(
      `/assets/?unstable_path=${encodeURIComponent('../shared/images/logo@2x.png')}&platform=web&hash=abc`,
    )
  })

  test('in production, the URL is the file that react-native bundle writes', () => {
    expect(assetURL(logo, 2, true)).toBe('/assets/images/logo@2x.png')
    const shared = { ...logo, httpServerLocation: '/assets/../../shared/images' }
    expect(assetURL(shared, 1, true)).toBe('/assets/__shared/images/logo.png')
  })
})
