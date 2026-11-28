import { createRequire } from 'node:module'
import { join } from 'node:path'

import { describe, expect, test, vi } from 'vitest'

const { withRootNative } = createRequire(import.meta.url)('../metro.cjs')

const projectRoot = '/app'
const appOrigin = join(projectRoot, 'package.json')
const libraryOrigin = '/app/node_modules/some-library/index.js'
const FACADE = '@rootnative/web-expo'
const REGISTRY = '@rootnative/web-expo/asset-registry'

// Resolves one name through the helper, and returns what reaches the next resolver.
const resolve = (moduleName, platform = 'web', resolveRequest = undefined) => {
  const next = vi.fn(() => ({ type: 'empty' }))
  const config = withRootNative({ projectRoot, resolver: { resolveRequest } })
  const context = { originModulePath: libraryOrigin, resolveRequest: next }
  const result = config.resolver.resolveRequest(context, moduleName, platform)
  const [nextContext, nextName, nextPlatform] = (resolveRequest ?? next).mock.calls[0]
  return { result, origin: nextContext.originModulePath, name: nextName, platform: nextPlatform }
}

describe('withRootNative on the web', () => {
  test.each([
    ['react-native', FACADE],
    ['react-native/index', FACADE],
    ['react-native/index.js', FACADE],
    ['react-native/asset-registry', REGISTRY],
    ['react-native/Libraries/Image/AssetRegistry', REGISTRY],
    ['react-native/Libraries/Image/AssetRegistry.js', REGISTRY],
    ['@react-native/assets-registry/registry', REGISTRY],
    ['@react-native/assets-registry/registry.js', REGISTRY],
    ['react-native-web', FACADE],
    ['react-native-web/asset-registry', REGISTRY],
    ['react-native-web/dist/index', `${FACADE}/dist/index`],
    ['react-native-web/dist/exports/View', `${FACADE}/dist/exports/View`],
    ['react-native-web/dist/exports/StyleSheet/dom', `${FACADE}/dist/exports/StyleSheet/dom`],
    [
      'react-native-web/dist/cjs/exports/StyleSheet/preprocess',
      `${FACADE}/dist/cjs/exports/StyleSheet/preprocess`,
    ],
  ])('sends %s to %s, resolved from the app', (moduleName, target) => {
    const { name, origin, platform } = resolve(moduleName)
    expect(name).toBe(target)
    expect(origin).toBe(appOrigin)
    expect(platform).toBe('web')
  })

  test.each([
    'react',
    'react-native-webview',
    'react-native-svg',
    'react-native/Libraries/Utilities/codegenNativeComponent',
    '@rootnative/web',
  ])('passes %s through unchanged', (moduleName) => {
    const { name, origin } = resolve(moduleName)
    expect(name).toBe(moduleName)
    expect(origin).toBe(libraryOrigin)
  })
})

describe('withRootNative on other platforms', () => {
  test.each(['ios', 'android', null])('passes react-native through unchanged on %s', (platform) => {
    const { name, origin } = resolve('react-native', platform)
    expect(name).toBe('react-native')
    expect(origin).toBe(libraryOrigin)
  })
})

describe('withRootNative and the config', () => {
  test('calls the resolveRequest that the config already has, and returns its result', () => {
    const upstream = vi.fn(() => ({ type: 'sourceFile', filePath: '/facade/index.js' }))
    const { result, name } = resolve('react-native', 'web', upstream)
    expect(upstream).toHaveBeenCalledOnce()
    expect(name).toBe(FACADE)
    expect(result).toEqual({ type: 'sourceFile', filePath: '/facade/index.js' })
  })

  test('keeps the other fields of the config', () => {
    const config = withRootNative({
      projectRoot,
      watchFolders: ['/workspace'],
      resolver: { sourceExts: ['ts', 'js'] },
    })
    expect(config.watchFolders).toEqual(['/workspace'])
    expect(config.resolver.sourceExts).toEqual(['ts', 'js'])
  })

  test('throws a clear error without projectRoot', () => {
    expect(() => withRootNative({ resolver: {} })).toThrow(/projectRoot/)
  })
})

// Each package keeps its own copy of the map, so that web-expo needs no web-metro at run time.
const metro = createRequire(import.meta.url)('../../web-metro/metro.cjs')

// The name that one helper sends to the next resolver on the web.
const targetOf = (helper, moduleName) => {
  const next = vi.fn(() => ({ type: 'empty' }))
  const context = { originModulePath: libraryOrigin, resolveRequest: next }
  helper.withRootNative({ projectRoot }).resolver.resolveRequest(context, moduleName, 'web')
  return next.mock.calls[0][1]
}

describe('withRootNative and web-metro', () => {
  test.each([
    'react-native',
    'react-native/index.js',
    'react-native/asset-registry',
    'react-native/Libraries/Image/AssetRegistry.js',
    '@react-native/assets-registry/registry',
    'react-native-web',
    'react-native-web/dist/exports/View',
    'react-native-web/dist/cjs/exports/StyleSheet/preprocess',
    'react-native/Libraries/Utilities/codegenNativeComponent',
    'react',
  ])('maps %s as web-metro does, to its own package', (moduleName) => {
    const own = targetOf({ withRootNative }, moduleName)
    const other = targetOf(metro, moduleName).replace('@rootnative/web-metro', FACADE)
    expect(own).toBe(other)
  })
})
